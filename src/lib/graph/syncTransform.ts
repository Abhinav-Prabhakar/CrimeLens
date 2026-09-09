import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
  RelationPredicate,
} from '../types/investigation';

/**
 * CrimeLens ⇄ Neo4j property mapping.
 *
 * Neo4j node/relationship properties must be primitives or primitive arrays,
 * so nested objects (attributes, provenance, boardPosition) are JSON-encoded
 * and coordinates are flattened. Predicates map to native relationship types
 * (whitelist-sanitized — relationship types cannot be parameterized in Cypher).
 */

const VALID_PREDICATES: RelationPredicate[] = [
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
];

const FALLBACK_PREDICATE: RelationPredicate = 'ASSOCIATED_WITH';

export const REL_TYPE_BY_PREDICATE: Record<RelationPredicate, string> = VALID_PREDICATES.reduce(
  (acc, p) => ({ ...acc, [p]: p }),
  {} as Record<RelationPredicate, string>
);

/** Whitelist-sanitize a predicate into a safe Cypher relationship type. */
export function predicateToRelType(predicate: unknown): string {
  const s = String(predicate || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return (VALID_PREDICATES as string[]).includes(s) ? s : FALLBACK_PREDICATE;
}

/** Recover the typed predicate from a stored edge (property first, type as fallback). */
export function relTypeToPredicate(type: string | undefined, prop: unknown): RelationPredicate {
  const propUpper = String(prop || '').toUpperCase();
  if ((VALID_PREDICATES as string[]).includes(propUpper)) return propUpper as RelationPredicate;
  const typeUpper = String(type || '').toUpperCase();
  if ((VALID_PREDICATES as string[]).includes(typeUpper)) return typeUpper as RelationPredicate;
  return FALLBACK_PREDICATE;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // "null" / primitives / arrays are valid JSON but not usable record objects
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

// ----------------- Entity -----------------

export interface EntityNodeProps {
  id: string;
  caseId: string;
  type: string;
  label: string;
  aliases: string[];
  attributesJson: string;
  confidence: number;
  status: string;
  visualType: string;
  notes: string;
  tags: string[];
  boardX: number;
  boardY: number;
  boardRotation: number;
  provenanceJson: string;
  createdAt: string;
  updatedAt: string;
}

export function entityToNodeProps(ent: InvestigationEntity): EntityNodeProps {
  return {
    id: ent.id,
    caseId: ent.caseId,
    type: ent.type,
    label: ent.label,
    aliases: ent.aliases || [],
    attributesJson: safeJson(ent.attributes || {}),
    confidence: Number(ent.confidence ?? 0.5),
    status: ent.status,
    visualType: ent.visualType,
    notes: ent.notes || '',
    tags: ent.tags || [],
    boardX: Number(ent.boardPosition?.x ?? 0),
    boardY: Number(ent.boardPosition?.y ?? 0),
    boardRotation: Number(ent.boardPosition?.rotation ?? 0),
    provenanceJson: safeJson(ent.provenance || {}),
    createdAt: ent.createdAt,
    updatedAt: ent.updatedAt,
  };
}

export function nodePropsToEntity(props: Record<string, any>): InvestigationEntity {
  return {
    id: String(props.id),
    caseId: String(props.caseId),
    type: props.type,
    label: props.label,
    aliases: Array.isArray(props.aliases) ? props.aliases : [],
    attributes: parseJson<Record<string, any>>(props.attributesJson, {}),
    confidence: Number(props.confidence ?? 0.5),
    status: props.status,
    provenance: parseJson(props.provenanceJson, {
      sourceId: 'unknown',
      sourceType: 'fir',
      sourceTitle: 'Unknown source',
      confidence: 0.5,
    }),
    boardPosition: {
      x: Number(props.boardX ?? 0),
      y: Number(props.boardY ?? 0),
      rotation: Number(props.boardRotation ?? 0),
    },
    visualType: props.visualType,
    notes: props.notes || '',
    tags: Array.isArray(props.tags) ? props.tags : [],
    createdAt: props.createdAt || new Date().toISOString(),
    updatedAt: props.updatedAt || new Date().toISOString(),
  };
}

// ----------------- Relationship -----------------

export interface RelEdgeProps {
  id: string;
  caseId: string;
  predicate: string;
  label: string;
  weight: number;
  confidence: number;
  status: string;
  threadColor: string;
  validFrom: string | null;
  validTo: string | null;
  provenanceJson: string;
  notes: string;
  manuallyConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export function relationshipToEdgeProps(rel: InvestigationRelationship): RelEdgeProps {
  return {
    id: rel.id,
    caseId: rel.caseId,
    predicate: predicateToRelType(rel.predicate),
    label: rel.label || rel.predicate,
    weight: Number(rel.weight ?? 1),
    confidence: Number(rel.confidence ?? 0.5),
    status: rel.status,
    threadColor: rel.threadColor,
    validFrom: rel.validFrom ?? null,
    validTo: rel.validTo ?? null,
    provenanceJson: safeJson(rel.provenance || {}),
    notes: rel.notes || '',
    manuallyConfirmed: Boolean(rel.manuallyConfirmed),
    createdAt: rel.createdAt,
    updatedAt: rel.updatedAt,
  };
}

export function edgePropsToRelationship(
  props: Record<string, any>,
  type: string | undefined,
  sourceId: string,
  targetId: string
): InvestigationRelationship {
  return {
    id: String(props.id),
    caseId: String(props.caseId),
    sourceId,
    targetId,
    predicate: relTypeToPredicate(type, props.predicate),
    label: props.label || undefined,
    weight: Number(props.weight ?? 1),
    confidence: Number(props.confidence ?? 0.5),
    status: props.status,
    threadColor: props.threadColor,
    validFrom: props.validFrom ?? undefined,
    validTo: props.validTo ?? undefined,
    provenance: parseJson(props.provenanceJson, {
      sourceId: 'unknown',
      sourceType: 'fir',
      sourceTitle: 'Unknown source',
      confidence: 0.5,
    }),
    notes: props.notes || undefined,
    manuallyConfirmed: Boolean(props.manuallyConfirmed),
    createdAt: props.createdAt || new Date().toISOString(),
    updatedAt: props.updatedAt || new Date().toISOString(),
  };
}

// ----------------- Case -----------------

export interface CaseNodeProps {
  id: string;
  title: string;
  caseNumber: string;
  description: string;
  status: string;
  priority: string;
  leadInvestigator: string;
  jurisdiction: string;
  incidentDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function caseToNodeProps(c: InvestigationCase): CaseNodeProps {
  return {
    id: c.id,
    title: c.title,
    caseNumber: c.caseNumber,
    description: c.description || '',
    status: c.status,
    priority: c.priority,
    leadInvestigator: c.leadInvestigator,
    jurisdiction: c.jurisdiction,
    incidentDate: c.incidentDate ?? null,
    tags: c.tags || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function nodePropsToCase(props: Record<string, any>): InvestigationCase {
  return {
    id: String(props.id),
    title: props.title,
    caseNumber: props.caseNumber,
    description: props.description || '',
    status: props.status,
    priority: props.priority,
    leadInvestigator: props.leadInvestigator,
    jurisdiction: props.jurisdiction,
    incidentDate: props.incidentDate ?? undefined,
    createdAt: props.createdAt || new Date().toISOString(),
    updatedAt: props.updatedAt || new Date().toISOString(),
    tags: Array.isArray(props.tags) ? props.tags : [],
  };
}

// ----------------- Document & Timeline Event -----------------

export function documentToNodeProps(d: IngestedDocument): Record<string, any> {
  return {
    id: d.id,
    caseId: d.caseId,
    title: d.title,
    documentType: d.documentType,
    rawText: d.rawText || '',
    summary: d.summary ?? null,
    extractionStatus: d.extractionStatus,
    extractedEntitiesCount: d.extractedEntitiesCount ?? null,
    extractedRelationshipsCount: d.extractedRelationshipsCount ?? null,
    importedAt: d.importedAt,
  };
}

export function nodePropsToDocument(props: Record<string, any>): IngestedDocument {
  return {
    id: String(props.id),
    caseId: String(props.caseId),
    title: props.title,
    documentType: props.documentType,
    rawText: props.rawText || '',
    summary: props.summary ?? undefined,
    extractionStatus: props.extractionStatus,
    extractedEntitiesCount: props.extractedEntitiesCount ?? undefined,
    extractedRelationshipsCount: props.extractedRelationshipsCount ?? undefined,
    importedAt: props.importedAt || new Date().toISOString(),
  };
}

export function timelineEventToNodeProps(ev: InvestigationTimelineEvent): Record<string, any> {
  return {
    id: ev.id,
    caseId: ev.caseId,
    timestamp: ev.timestamp,
    title: ev.title,
    category: ev.category,
    description: ev.description || '',
    involvedEntityIds: ev.involvedEntityIds || [],
    source: ev.source,
    sourceRefId: ev.sourceRefId ?? null,
    createdAt: ev.createdAt,
  };
}

export function nodePropsToTimelineEvent(props: Record<string, any>): InvestigationTimelineEvent {
  return {
    id: String(props.id),
    caseId: String(props.caseId),
    timestamp: props.timestamp,
    title: props.title,
    category: props.category,
    description: props.description || '',
    involvedEntityIds: Array.isArray(props.involvedEntityIds) ? props.involvedEntityIds : [],
    source: props.source,
    sourceRefId: props.sourceRefId ?? undefined,
    createdAt: props.createdAt || new Date().toISOString(),
  };
}
