import { z } from 'zod';
import type Groq from 'groq-sdk';
import {
  getCaseGraph,
  upsertEntity,
  deleteEntityCascade,
  upsertRelationship,
  updateRelationshipProps,
  deleteRelationshipById,
  mergeEntities,
  upsertTimelineEvent,
  findExistingEntity,
  collisionFreePosition,
  genId,
} from '../graph/neo4j';
import { predicateToRelType } from '../graph/syncTransform';
import {
  EntityType,
  RelationPredicate,
  InvestigationEntity,
  InvestigationRelationship,
  InvestigationTimelineEvent,
  defaultVisualTypeForEntityType,
} from '../types/investigation';

/**
 * AI Investigator Assistant — tool_use (function calling) surface.
 *
 * Server-only module: executes validated graph mutations against Neo4j on
 * behalf of the assistant, mirroring the conventions used by commitExtraction
 * (genId ids, ai_inferred status, explicit provenance, collision-free board
 * positions). Every call is zod-validated and errors are returned as data so
 * the route can feed them back to the model as tool results.
 */

// ----------------- Shared argument fragments -----------------

const ENTITY_TYPES = [
  'person',
  'organization',
  'location',
  'vehicle',
  'phone',
  'account',
  'document',
  'event',
  'evidence_item',
] as const;

const PREDICATES = [
  'KNOWS',
  'CALLED',
  'TRANSFERRED_FUNDS',
  'OWNS',
  'WORKS_FOR',
  'LOCATED_AT',
  'TRAVELED_TO',
  'ASSOCIATED_WITH',
  'MENTIONED_IN',
  'PARTICIPATED_IN',
  'SUSPECTED_IN',
  'COMMUNICATED_WITH',
  'OWNS_DEVICE',
  'OPERATES_AT',
] as const;

const VERIFICATION_STATUSES = [
  'verified_source',
  'ai_inferred',
  'investigator_confirmed',
  'unverified',
  'predicted',
] as const;

const THREAD_COLORS = ['crimson', 'twine', 'cobalt', 'shadow'] as const;

const TIMELINE_CATEGORIES = [
  'incident',
  'communication',
  'financial',
  'forensic',
  'surveillance',
  'document',
] as const;

/** Entities are referenced by graph id or (unambiguous) label/alias. */
const entityRef = z
  .string()
  .min(1)
  .max(300)
  .describe('Entity id (ent_...) or exact label/alias from the case context');

const confidenceScore = z.number().min(0).max(1);
const shortText = z.string().min(1).max(300);
const longText = z.string().max(4000);

// ----------------- Zod argument schemas -----------------

export const ASSISTANT_TOOL_ARG_SCHEMAS = {
  create_entity: z.object({
    label: shortText.describe('Display name of the entity'),
    type: z.enum(ENTITY_TYPES).default('person'),
    aliases: z.array(shortText).max(20).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    confidence: confidenceScore.optional(),
    notes: longText.optional(),
    tags: z.array(shortText).max(20).optional(),
    excerpt: longText.optional().describe('Evidence excerpt supporting this entity'),
  }),
  update_entity: z.object({
    entity: entityRef,
    updates: z
      .object({
        label: shortText.optional(),
        type: z.enum(ENTITY_TYPES).optional(),
        aliases: z.array(shortText).max(20).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        confidence: confidenceScore.optional(),
        status: z.enum(VERIFICATION_STATUSES).optional(),
        notes: longText.optional(),
        tags: z.array(shortText).max(20).optional(),
      })
      .refine((u) => Object.keys(u).length > 0, { message: 'updates must include at least one field' }),
  }),
  delete_entity: z.object({
    entity: entityRef,
  }),
  create_relationship: z.object({
    source: entityRef.describe('Source entity id or label'),
    target: entityRef.describe('Target entity id or label'),
    predicate: z.enum(PREDICATES).default('ASSOCIATED_WITH'),
    label: shortText.optional(),
    weight: z.number().min(0).max(10).optional(),
    confidence: confidenceScore.optional(),
    threadColor: z.enum(THREAD_COLORS).optional(),
    notes: longText.optional(),
  }),
  update_relationship: z.object({
    relationshipId: z.string().min(1).max(300).describe('Relationship id (rel_...) from the case context'),
    updates: z
      .object({
        predicate: z.enum(PREDICATES).optional(),
        label: shortText.optional(),
        weight: z.number().min(0).max(10).optional(),
        confidence: confidenceScore.optional(),
        status: z.enum(VERIFICATION_STATUSES).optional(),
        threadColor: z.enum(THREAD_COLORS).optional(),
        notes: longText.optional(),
        manuallyConfirmed: z.boolean().optional(),
      })
      .refine((u) => Object.keys(u).length > 0, { message: 'updates must include at least one field' }),
  }),
  delete_relationship: z.object({
    relationshipId: z.string().min(1).max(300),
  }),
  merge_entities: z.object({
    kept: entityRef.describe('Entity to keep (receives merged aliases/attributes/edges)'),
    merged: entityRef.describe('Duplicate entity to absorb into the kept one'),
  }),
  add_timeline_event: z.object({
    title: shortText.optional(),
    description: z.string().min(1).max(4000),
    timestamp: z.string().max(100).optional().describe('ISO timestamp of when the event occurred'),
    category: z.enum(TIMELINE_CATEGORIES).optional(),
    involvedEntities: z.array(entityRef).max(30).optional(),
  }),
} as const;

export type AssistantToolName = keyof typeof ASSISTANT_TOOL_ARG_SCHEMAS;

// ----------------- Groq/OpenAI tool definitions -----------------

const entityRefJson = {
  type: 'string',
  description: 'Entity id (ent_...) or exact label/alias as listed in the case context',
};

export const ASSISTANT_TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_entity',
      description:
        'Add a new entity (person, organization, location, vehicle, phone, account, document, event, evidence_item) to the investigation board. Refuses if an entity with the same label/alias already exists — use update_entity instead.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Display name of the entity' },
          type: { type: 'string', enum: ENTITY_TYPES, description: 'Semantic entity type (default person)' },
          aliases: { type: 'array', items: { type: 'string' }, description: 'Known alternate names' },
          attributes: { type: 'object', description: 'Key-value attributes (e.g. phone, role, address)' },
          confidence: { type: 'number', description: '0.0-1.0 confidence in this record' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          excerpt: { type: 'string', description: 'Evidence excerpt supporting this entity' },
        },
        required: ['label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_entity',
      description: 'Update fields of an existing entity (label, type, aliases, attributes, confidence, status, notes, tags).',
      parameters: {
        type: 'object',
        properties: {
          entity: entityRefJson,
          updates: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              type: { type: 'string', enum: ENTITY_TYPES },
              aliases: { type: 'array', items: { type: 'string' } },
              attributes: { type: 'object' },
              confidence: { type: 'number' },
              status: { type: 'string', enum: VERIFICATION_STATUSES },
              notes: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['entity', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_entity',
      description: 'Remove an entity from the investigation, cascading its relationships. Destructive — only use when clearly requested or clearly a duplicate/error.',
      parameters: {
        type: 'object',
        properties: { entity: entityRefJson },
        required: ['entity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_relationship',
      description: 'Connect two entities with a typed relationship (predicate). Source and target may be entity ids or exact labels.',
      parameters: {
        type: 'object',
        properties: {
          source: entityRefJson,
          target: entityRefJson,
          predicate: { type: 'string', enum: PREDICATES, description: 'Relationship predicate (default ASSOCIATED_WITH)' },
          label: { type: 'string', description: 'Human-readable connection label' },
          weight: { type: 'number', description: 'Connection strength 0-10' },
          confidence: { type: 'number', description: '0.0-1.0' },
          threadColor: { type: 'string', enum: THREAD_COLORS },
          notes: { type: 'string' },
        },
        required: ['source', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_relationship',
      description: 'Update an existing relationship (predicate, label, weight, confidence, status, threadColor, notes, manuallyConfirmed).',
      parameters: {
        type: 'object',
        properties: {
          relationshipId: { type: 'string', description: 'Relationship id (rel_...) from the case context' },
          updates: {
            type: 'object',
            properties: {
              predicate: { type: 'string', enum: PREDICATES },
              label: { type: 'string' },
              weight: { type: 'number' },
              confidence: { type: 'number' },
              status: { type: 'string', enum: VERIFICATION_STATUSES },
              threadColor: { type: 'string', enum: THREAD_COLORS },
              notes: { type: 'string' },
              manuallyConfirmed: { type: 'boolean' },
            },
          },
        },
        required: ['relationshipId', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_relationship',
      description: 'Remove a relationship (thread) between two entities by its id.',
      parameters: {
        type: 'object',
        properties: {
          relationshipId: { type: 'string', description: 'Relationship id (rel_...) from the case context' },
        },
        required: ['relationshipId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'merge_entities',
      description: 'Merge two entity records that refer to the same real-world identity. The kept entity absorbs the duplicate\'s aliases, attributes, tags and relationships.',
      parameters: {
        type: 'object',
        properties: {
          kept: entityRefJson,
          merged: entityRefJson,
        },
        required: ['kept', 'merged'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_timeline_event',
      description: 'Pin a dated event onto the investigation timeline, optionally linking involved entities.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short event title (defaults to the description)' },
          description: { type: 'string', description: 'What happened' },
          timestamp: { type: 'string', description: 'ISO timestamp of when the event occurred (defaults to now)' },
          category: { type: 'string', enum: TIMELINE_CATEGORIES },
          involvedEntities: { type: 'array', items: entityRefJson, description: 'Entity ids or labels involved' },
        },
        required: ['description'],
      },
    },
  },
];

// ----------------- Validation -----------------

export type ToolArgsValidation =
  | { ok: true; args: Record<string, any> }
  | { ok: false; summary: string };

/** Parse the raw JSON argument string and validate it against the tool's zod schema. */
export function validateAssistantToolArgs(name: string, rawArgs: string): ToolArgsValidation {
  const schema = (ASSISTANT_TOOL_ARG_SCHEMAS as Record<string, z.ZodTypeAny>)[name];
  if (!schema) {
    return { ok: false, summary: `Unknown tool "${name}".` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs || '{}');
  } catch {
    return { ok: false, summary: `Malformed JSON arguments for ${name}.` };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'args'}: ${issue.message}`)
      .join('; ');
    return { ok: false, summary: `Invalid arguments for ${name}: ${detail}` };
  }
  return { ok: true, args: result.data as Record<string, any> };
}

// ----------------- Execution -----------------

export interface AssistantAction {
  tool: string;
  summary: string;
  ok: boolean;
}

const ASSISTANT_PROVENANCE = (confidence: number, excerpt?: string) => ({
  sourceId: 'ai_assistant',
  sourceType: 'public_intel' as const,
  sourceTitle: 'AI Investigator Assistant',
  excerpt,
  confidence,
});

/**
 * Resolve an entity reference (id or exact case-insensitive label/alias) against
 * the live case graph. Throws with a model-readable message on miss/ambiguity.
 */
function resolveEntityRef(ref: string, entities: InvestigationEntity[]): InvestigationEntity {
  const byId = entities.find((e) => e.id === ref);
  if (byId) return byId;
  const norm = ref.toLowerCase().trim();
  const matches = entities.filter(
    (e) => e.label.toLowerCase() === norm || e.aliases.some((a) => a.toLowerCase() === norm)
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(
      `Entity reference "${ref}" is ambiguous — matches ${matches
        .map((e) => `${e.label} (${e.id})`)
        .join(', ')}. Use the entity id instead.`
    );
  }
  throw new Error(`Entity "${ref}" not found in this case. Use an id or exact label from the case context.`);
}

async function runTool(name: AssistantToolName, args: Record<string, any>, caseId: string): Promise<string> {
  const now = new Date().toISOString();

  switch (name) {
    case 'create_entity': {
      const { entities: existing } = await getCaseGraph(caseId);
      const type = args.type as EntityType;
      const dupe = findExistingEntity(args.label, type, existing);
      if (dupe) {
        throw new Error(
          `Entity "${args.label}" already exists as "${dupe.label}" (${dupe.id}). Use update_entity to modify it.`
        );
      }
      const confidence = args.confidence ?? 0.7;
      const entity: InvestigationEntity = {
        id: genId('ent'),
        caseId,
        type,
        label: args.label,
        aliases: args.aliases || [],
        attributes: args.attributes || {},
        confidence,
        status: 'ai_inferred',
        provenance: ASSISTANT_PROVENANCE(confidence, args.excerpt),
        boardPosition: collisionFreePosition(existing),
        visualType: defaultVisualTypeForEntityType(type),
        notes: args.notes || 'Added via AI Investigator Assistant',
        tags: Array.from(new Set(['ai_assistant', type, ...(args.tags || [])])),
        createdAt: now,
        updatedAt: now,
      };
      await upsertEntity(entity);
      return `Added entity '${entity.label}' (${entity.type}, id ${entity.id})`;
    }

    case 'update_entity': {
      const { entities } = await getCaseGraph(caseId);
      const target = resolveEntityRef(args.entity, entities);
      const updated: InvestigationEntity = {
        ...target,
        ...args.updates,
        id: target.id,
        caseId,
        updatedAt: now,
      };
      await upsertEntity(updated);
      return `Updated entity '${updated.label}' (${Object.keys(args.updates).join(', ')})`;
    }

    case 'delete_entity': {
      const { entities } = await getCaseGraph(caseId);
      const target = resolveEntityRef(args.entity, entities);
      await deleteEntityCascade(target.id);
      return `Removed entity '${target.label}' and its connections`;
    }

    case 'create_relationship': {
      const { entities } = await getCaseGraph(caseId);
      const source = resolveEntityRef(args.source, entities);
      const target = resolveEntityRef(args.target, entities);
      if (source.id === target.id) {
        throw new Error('Source and target resolve to the same entity; self-links are not supported.');
      }
      const predicate = predicateToRelType(args.predicate) as RelationPredicate;
      const confidence = args.confidence ?? 0.7;
      const rel: InvestigationRelationship = {
        id: genId('rel'),
        caseId,
        sourceId: source.id,
        targetId: target.id,
        predicate,
        label: args.label || predicate.toLowerCase().replace(/_/g, ' '),
        weight: args.weight ?? 1,
        confidence,
        status: 'ai_inferred',
        threadColor: args.threadColor || 'crimson',
        provenance: ASSISTANT_PROVENANCE(confidence),
        notes: args.notes,
        manuallyConfirmed: false,
        createdAt: now,
        updatedAt: now,
      };
      await upsertRelationship(rel);
      return `Connected '${source.label}' --[${predicate}]--> '${target.label}' (id ${rel.id})`;
    }

    case 'update_relationship': {
      const updates = { ...args.updates };
      if (updates.predicate) updates.predicate = predicateToRelType(updates.predicate);
      const updated = await updateRelationshipProps(args.relationshipId, updates);
      if (!updated) {
        throw new Error(`Relationship ${args.relationshipId} not found. Use a rel_ id from the case context.`);
      }
      return `Updated relationship ${updated.id} (${Object.keys(args.updates).join(', ')})`;
    }

    case 'delete_relationship': {
      const deleted = await deleteRelationshipById(args.relationshipId);
      if (!deleted) {
        throw new Error(`Relationship ${args.relationshipId} not found. Use a rel_ id from the case context.`);
      }
      return `Removed relationship ${args.relationshipId}`;
    }

    case 'merge_entities': {
      const { entities } = await getCaseGraph(caseId);
      const kept = resolveEntityRef(args.kept, entities);
      const merged = resolveEntityRef(args.merged, entities);
      if (kept.id === merged.id) {
        throw new Error('Kept and merged references resolve to the same entity.');
      }
      const result = await mergeEntities(kept.id, merged.id);
      return `Merged '${merged.label}' into '${kept.label}' — ${result.movedRelationshipCount} connection(s) transferred`;
    }

    case 'add_timeline_event': {
      const { entities } = await getCaseGraph(caseId);
      const unresolved: string[] = [];
      const involvedEntityIds = Array.from(
        new Set(
          ((args.involvedEntities || []) as string[])
            .map((ref: string) => {
              try {
                return resolveEntityRef(ref, entities).id;
              } catch {
                unresolved.push(ref);
                return null;
              }
            })
            .filter((id: string | null): id is string => Boolean(id))
        )
      );
      const parsedTs = args.timestamp ? new Date(args.timestamp) : null;
      const event: InvestigationTimelineEvent = {
        id: genId('ev'),
        caseId,
        timestamp: parsedTs && !Number.isNaN(parsedTs.getTime()) ? parsedTs.toISOString() : now,
        title: args.title || String(args.description).slice(0, 90),
        category: args.category || 'surveillance',
        description: args.description,
        involvedEntityIds,
        source: 'ai_extraction',
        sourceRefId: 'ai_assistant',
        createdAt: now,
      };
      await upsertTimelineEvent(event);
      const suffix =
        unresolved.length > 0 ? ` (unresolved entity refs skipped: ${unresolved.join(', ')})` : '';
      return `Added timeline event '${event.title}' (${involvedEntityIds.length} entities linked)${suffix}`;
    }

    default:
      throw new Error(`No executor implemented for tool "${name}".`);
  }
}

/**
 * Validate and execute one assistant tool call. Never throws — failures are
 * returned as { ok: false } so the route can feed them back to the model.
 */
export async function executeAssistantTool(
  name: string,
  rawArgs: string,
  caseId?: string
): Promise<AssistantAction> {
  const validation = validateAssistantToolArgs(name, rawArgs);
  if (!validation.ok) {
    return { tool: name, ok: false, summary: validation.summary };
  }
  if (!caseId) {
    return { tool: name, ok: false, summary: 'No active case context — graph mutations are unavailable.' };
  }
  try {
    const summary = await runTool(name as AssistantToolName, validation.args, caseId);
    return { tool: name, ok: true, summary };
  } catch (err: any) {
    return { tool: name, ok: false, summary: err?.message || `${name} failed unexpectedly.` };
  }
}
