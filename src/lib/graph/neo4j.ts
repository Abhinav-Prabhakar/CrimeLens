import neo4j, { Driver } from 'neo4j-driver';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
  EntityType,
} from '../types/investigation';
import { stringSimilarity } from '../resolution/identityMatcher';
import { detectSuspiciousPatterns } from '../patterns/anomalyDetectors';
import { validateBundle, planImport, CaseBundle } from '../storage/importExport';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../storage/seedData';
import {
  entityToNodeProps,
  nodePropsToEntity,
  relationshipToEdgeProps,
  edgePropsToRelationship,
  caseToNodeProps,
  nodePropsToCase,
  documentToNodeProps,
  nodePropsToDocument,
  timelineEventToNodeProps,
  nodePropsToTimelineEvent,
  predicateToRelType,
} from './syncTransform';

/**
 * Neo4j-backed Knowledge Graph — the system of record for all case graph data.
 * Server-only: imported exclusively by /api/graph route handlers; credentials
 * stay in server environment variables and never reach the client bundle.
 *
 * Zero-fallback: unconfigured credentials or an unreachable server surface as
 * explicit errors, never silently degraded data.
 */

let driverInstance: Driver | null = null;

export function getNeo4jDriver(): Driver | null {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !password || !user) return null;

  if (!driverInstance) {
    driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      // JSON-safe numbers (confidence/weight are well within 2^53) and a small
      // pool sized for serverless/edge runtimes.
      disableLosslessIntegers: true,
      maxConnectionPoolSize: 5,
    });
  }
  return driverInstance;
}

function database(): string {
  return process.env.NEO4J_DATABASE || 'neo4j';
}

export class GraphDatabaseError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GraphDatabaseError';
    this.status = status;
  }
}

/** Driver with explicit, actionable configuration errors (zero-fallback). */
export function requireDriver(): Driver {
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new GraphDatabaseError(
      'Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD in the server environment.',
      503
    );
  }
  return driver;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent schema bootstrap: uniqueness constraints + lookup indexes. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const driver = requireDriver();
      const statements = [
        'CREATE CONSTRAINT case_id_unique IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE',
        'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
        'CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
        'CREATE CONSTRAINT timeline_event_id_unique IF NOT EXISTS FOR (t:TimelineEvent) REQUIRE t.id IS UNIQUE',
        'CREATE INDEX entity_case_idx IF NOT EXISTS FOR (e:Entity) ON (e.caseId)',
        'CREATE INDEX document_case_idx IF NOT EXISTS FOR (d:Document) ON (d.caseId)',
        'CREATE INDEX timeline_event_case_idx IF NOT EXISTS FOR (t:TimelineEvent) ON (t.caseId)',
      ];
      for (const query of statements) {
        await driver.executeQuery(query, {}, { database: database() });
      }
    })().catch((err) => {
      schemaReady = null; // retry on next request
      throw err;
    });
  }
  return schemaReady;
}

async function run(query: string, params: Record<string, unknown> = {}) {
  const driver = requireDriver();
  await ensureSchema();
  return driver.executeQuery(query, params, { database: database() });
}

// ----------------- Reads -----------------

export interface CaseSummary {
  caseItem: InvestigationCase;
  entityCount: number;
  relationshipCount: number;
  anomalyCount: number;
}

export async function listCases(): Promise<CaseSummary[]> {
  const { records } = await run('MATCH (c:Case) RETURN properties(c) AS props ORDER BY c.createdAt');
  const summaries: CaseSummary[] = [];
  for (const record of records) {
    const caseItem = nodePropsToCase(record.get('props'));
    const state = await getCaseGraph(caseItem.id);
    summaries.push({
      caseItem,
      entityCount: state.entities.length,
      relationshipCount: state.relationships.length,
      anomalyCount: detectSuspiciousPatterns(
        state.entities,
        state.relationships,
        caseItem.incidentDate
      ).length,
    });
  }
  return summaries;
}

export interface CaseGraph {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
}

export async function getCaseGraph(caseId: string): Promise<CaseGraph> {
  const [entitiesResult, relsResult] = await Promise.all([
    run('MATCH (e:Entity {caseId: $caseId}) RETURN properties(e) AS props', { caseId }),
    run(
      `MATCH (a:Entity {caseId: $caseId})-[r]->(b:Entity)
       RETURN properties(r) AS props, type(r) AS type, a.id AS sourceId, b.id AS targetId`,
      { caseId }
    ),
  ]);
  return {
    entities: entitiesResult.records.map((r) => nodePropsToEntity(r.get('props'))),
    relationships: relsResult.records.map((r) =>
      edgePropsToRelationship(r.get('props'), r.get('type'), r.get('sourceId'), r.get('targetId'))
    ),
  };
}

export interface FullCaseState extends CaseGraph {
  caseItem: InvestigationCase | null;
  documents: IngestedDocument[];
  timelineEvents: InvestigationTimelineEvent[];
}

export async function getCaseState(caseId: string): Promise<FullCaseState> {
  const [caseResult, graph, docsResult, eventsResult] = await Promise.all([
    run('MATCH (c:Case {id: $caseId}) RETURN properties(c) AS props', { caseId }),
    getCaseGraph(caseId),
    run('MATCH (d:Document {caseId: $caseId}) RETURN properties(d) AS props ORDER BY d.importedAt', { caseId }),
    run('MATCH (t:TimelineEvent {caseId: $caseId}) RETURN properties(t) AS props ORDER BY t.timestamp', { caseId }),
  ]);

  return {
    caseItem: caseResult.records.length > 0 ? nodePropsToCase(caseResult.records[0].get('props')) : null,
    entities: graph.entities,
    relationships: graph.relationships,
    documents: docsResult.records.map((r) => nodePropsToDocument(r.get('props'))),
    timelineEvents: eventsResult.records.map((r) => nodePropsToTimelineEvent(r.get('props'))),
  };
}

// ----------------- Case writes -----------------

export async function upsertCase(caseItem: InvestigationCase): Promise<InvestigationCase> {
  await run(
    `MERGE (c:Case {id: $id})
     SET c += $props`,
    { id: caseItem.id, props: caseToNodeProps(caseItem) }
  );
  return caseItem;
}

export async function deleteCase(caseId: string): Promise<void> {
  await run(
    `MATCH (c:Case {id: $caseId})
     OPTIONAL MATCH (c)-[:HAS_ENTITY]->(e:Entity)
     OPTIONAL MATCH (c)-[:HAS_DOCUMENT]->(d:Document)
     OPTIONAL MATCH (c)-[:HAS_EVENT]->(t:TimelineEvent)
     DETACH DELETE c, e, d, t`,
    { caseId }
  );
}

// ----------------- Entity writes -----------------

export async function upsertEntity(entity: InvestigationEntity): Promise<InvestigationEntity> {
  await run(
    `MERGE (e:Entity {id: $id})
     SET e += $props
     WITH e
     MATCH (c:Case {id: $caseId})
     MERGE (c)-[:HAS_ENTITY]->(e)`,
    { id: entity.id, caseId: entity.caseId, props: entityToNodeProps(entity) }
  );
  return entity;
}

export async function deleteEntityCascade(entityId: string): Promise<void> {
  await run('MATCH (e:Entity {id: $id}) DETACH DELETE e', { id: entityId });
}

/** Resolve the owning case of an entity via its caseId property (indexed). */
export async function getEntityCaseId(entityId: string): Promise<string | null> {
  const { records } = await run('MATCH (e:Entity {id: $id}) RETURN e.caseId AS caseId', { id: entityId });
  return records.length > 0 ? String(records[0].get('caseId')) : null;
}

// ----------------- Relationship writes -----------------

export async function upsertRelationship(rel: InvestigationRelationship): Promise<InvestigationRelationship> {
  // Relationship types cannot be parameterized; predicateToRelType whitelists it.
  const relType = predicateToRelType(rel.predicate);
  await run(
    `MATCH (a:Entity {id: $sourceId}), (b:Entity {id: $targetId})
     CALL {
       WITH a, b
       OPTIONAL MATCH (a)-[existing {id: $id}]->(b)
       WITH collect(existing) AS edges
       FOREACH (e IN edges | DELETE e)
     }
     CREATE (a)-[r:${relType}]->(b)
     SET r = $props`,
    { sourceId: rel.sourceId, targetId: rel.targetId, id: rel.id, props: relationshipToEdgeProps(rel) }
  );
  return rel;
}

export async function updateRelationshipProps(
  relId: string,
  updates: Partial<InvestigationRelationship>
): Promise<InvestigationRelationship | null> {
  const existing = await run(
    `MATCH (a:Entity)-[r {id: $id}]->(b:Entity)
     RETURN properties(r) AS props, type(r) AS type, a.id AS sourceId, b.id AS targetId`,
    { id: relId }
  );
  if (existing.records.length === 0) return null;

  const current = edgePropsToRelationship(
    existing.records[0].get('props'),
    existing.records[0].get('type'),
    existing.records[0].get('sourceId'),
    existing.records[0].get('targetId')
  );
  const next: InvestigationRelationship = { ...current, ...updates, updatedAt: new Date().toISOString() };

  // Type change requires recreating the edge; property-only changes SET in place
  if (updates.predicate && predicateToRelType(updates.predicate) !== predicateToRelType(current.predicate)) {
    await run(
      `MATCH (a:Entity {id: $sourceId})-[r {id: $id}]->(b:Entity {id: $targetId}) DELETE r
       WITH a, b
       CREATE (a)-[nr:${predicateToRelType(next.predicate)}]->(b)
       SET nr = $props`,
      { sourceId: next.sourceId, targetId: next.targetId, id: next.id, props: relationshipToEdgeProps(next) }
    );
  } else {
    await run(`MATCH ()-[r {id: $id}]->() SET r += $props`, {
      id: next.id,
      props: relationshipToEdgeProps(next),
    });
  }
  return next;
}

export async function deleteRelationshipById(relId: string): Promise<boolean> {
  const { summary } = await run(`MATCH ()-[r {id: $id}]->() DELETE r`, { id: relId });
  return (summary.counters.updates().relationshipsDeleted ?? 0) > 0;
}

// ----------------- Documents & timeline events -----------------

export async function upsertDocument(doc: IngestedDocument): Promise<IngestedDocument> {
  await run(
    `MERGE (d:Document {id: $id})
     SET d += $props
     WITH d
     MATCH (c:Case {id: $caseId})
     MERGE (c)-[:HAS_DOCUMENT]->(d)`,
    { id: doc.id, caseId: doc.caseId, props: documentToNodeProps(doc) }
  );
  return doc;
}

export async function upsertTimelineEvent(ev: InvestigationTimelineEvent): Promise<InvestigationTimelineEvent> {
  await run(
    `MERGE (t:TimelineEvent {id: $id})
     SET t += $props
     WITH t
     MATCH (c:Case {id: $caseId})
     MERGE (c)-[:HAS_EVENT]->(t)`,
    { id: ev.id, caseId: ev.caseId, props: timelineEventToNodeProps(ev) }
  );
  return ev;
}

// ----------------- Identity merge -----------------

export interface MergeResult {
  kept: InvestigationEntity;
  movedRelationshipCount: number;
}

export async function mergeEntities(keptId: string, mergedId: string): Promise<MergeResult> {
  const read = await run(
    `MATCH (k:Entity {id: $keptId}), (m:Entity {id: $mergedId})
     RETURN properties(k) AS kept, properties(m) AS merged`,
    { keptId, mergedId }
  );
  if (read.records.length === 0) {
    throw new GraphDatabaseError('One or both entities to merge do not exist.', 404);
  }

  const kept = nodePropsToEntity(read.records[0].get('kept'));
  const merged = nodePropsToEntity(read.records[0].get('merged'));

  // Union in application space: kept wins attribute conflicts, merged contributes the rest
  const attributes = { ...(merged.attributes || {}), ...(kept.attributes || {}) };
  const updatedKept: InvestigationEntity = {
    ...kept,
    aliases: Array.from(new Set([...kept.aliases, merged.label, ...merged.aliases])).filter(
      (a) => a.toLowerCase() !== kept.label.toLowerCase()
    ),
    attributes,
    tags: Array.from(new Set([...kept.tags, ...merged.tags])),
    notes: `${kept.notes || ''}\n[MERGED IDENTITY]: Combined records with ${merged.label} (records unified on ${new Date().toLocaleDateString()}).`.trim(),
    updatedAt: new Date().toISOString(),
  };

  // Recreate merged's edges against the kept entity (same ids/props), then drop the merged node
  const edges = await run(
    `MATCH (m:Entity {id: $mergedId})-[r]-(other:Entity)
     WHERE other.id <> $mergedId
     RETURN properties(r) AS props, type(r) AS type,
            CASE WHEN startNode(r).id = $mergedId THEN 'out' ELSE 'in' END AS direction,
            other.id AS otherId`,
    { mergedId }
  );

  const driver = requireDriver();
  const session = driver.session({ database: database() });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MATCH (e:Entity {id: $mergedId}) DETACH DELETE e`,
        { mergedId }
      );
      for (const record of edges.records) {
        const props = record.get('props');
        const relType = predicateToRelType(props.predicate || record.get('type'));
        const direction = record.get('direction');
        const otherId = record.get('otherId');
        const sourceId = direction === 'out' ? keptId : otherId;
        const targetId = direction === 'out' ? otherId : keptId;
        if (sourceId === targetId) continue; // drop self-loops created by the merge
        await tx.run(
          `MATCH (a:Entity {id: $sourceId}), (b:Entity {id: $targetId})
           CREATE (a)-[r:${relType}]->(b)
           SET r = $props`,
          { sourceId, targetId, props: { ...props, updatedAt: new Date().toISOString() } }
        );
      }
    });
  } finally {
    await session.close();
  }

  await upsertEntity(updatedKept);
  return { kept: updatedKept, movedRelationshipCount: edges.records.length };
}

// ----------------- AI extraction commit (human-in-the-loop approved) -----------------

function findExistingEntity(
  label: string,
  type: EntityType,
  existing: InvestigationEntity[]
): InvestigationEntity | null {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(label);
  if (!target) return null;
  for (const e of existing) {
    if (norm(e.label) === target) return e;
    if (e.aliases.some((a) => norm(a) === target)) return e;
  }
  let best: InvestigationEntity | null = null;
  let bestSim = 0;
  for (const e of existing) {
    if (e.type !== type) continue;
    const sim = stringSimilarity(e.label, label);
    if (sim > bestSim) {
      bestSim = sim;
      best = e;
    }
  }
  return best && bestSim >= 0.92 ? best : null;
}

function collisionFreePosition(existing: InvestigationEntity[]): { x: number; y: number } {
  const occupied = existing.map((e) => e.boardPosition);
  const farEnough = (x: number, y: number) => occupied.every((p) => Math.hypot(p.x - x, p.y - y) >= 13);
  for (let i = 0; i < 80; i++) {
    const x = (Math.random() - 0.5) * 54;
    const y = (Math.random() - 0.5) * 36;
    if (farEnough(x, y)) return { x, y };
  }
  const ring = 14 + Math.floor(occupied.length / 12) * 6;
  const angle = occupied.length * 1.7;
  return { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring * 0.7 };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export interface CommitExtractionResult {
  addedEntities: InvestigationEntity[];
  addedRelationships: InvestigationRelationship[];
  addedEvents: InvestigationTimelineEvent[];
  updatedEntities: InvestigationEntity[];
  document: IngestedDocument;
}

export async function commitExtraction(
  caseId: string,
  extractedEntities: any[],
  extractedRelationships: any[],
  extractedEvents: any[],
  docMeta: { title: string; documentType: string; rawText: string; summary?: string }
): Promise<CommitExtractionResult> {
  const { entities: existing } = await getCaseGraph(caseId);

  const labelToIdMap = new Map<string, string>();
  const working = [...existing];
  existing.forEach((e) => {
    labelToIdMap.set(e.label.toLowerCase(), e.id);
    e.aliases.forEach((a) => labelToIdMap.set(a.toLowerCase(), e.id));
  });

  const addedEntities: InvestigationEntity[] = [];
  const updatedEntities: InvestigationEntity[] = [];

  for (const item of extractedEntities) {
    const type = (item.type as EntityType) || 'person';
    const existingMatch = findExistingEntity(item.label, type, working);
    if (existingMatch) {
      labelToIdMap.set(item.label.toLowerCase(), existingMatch.id);
      const newAliases = (item.aliases || []).filter(
        (a: string) =>
          a.toLowerCase() !== existingMatch.label.toLowerCase() &&
          !existingMatch.aliases.some((x) => x.toLowerCase() === a.toLowerCase())
      );
      if (newAliases.length > 0) {
        const updated = {
          ...existingMatch,
          aliases: [...existingMatch.aliases, ...newAliases],
          updatedAt: new Date().toISOString(),
        };
        await upsertEntity(updated);
        updatedEntities.push(updated);
        working.splice(working.indexOf(existingMatch), 1, updated);
      }
      continue;
    }

    const newId = genId('ent');
    labelToIdMap.set(item.label.toLowerCase(), newId);
    const newEnt: InvestigationEntity = {
      id: newId,
      caseId,
      type,
      label: item.label,
      aliases: item.aliases || [],
      attributes: item.attributes || {},
      confidence: item.confidence || 0.8,
      status: 'ai_inferred',
      provenance: {
        sourceId: 'ai_extraction',
        sourceType: 'fir',
        sourceTitle: docMeta.title,
        excerpt: item.excerpt,
        confidence: item.confidence || 0.8,
      },
      boardPosition: collisionFreePosition(working),
      visualType: item.visualType || 'suspect',
      notes: item.notes || `Extracted from ${docMeta.title}`,
      tags: ['ai_extracted', type],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertEntity(newEnt);
    addedEntities.push(newEnt);
    working.push(newEnt);
  }

  const addedRelationships: InvestigationRelationship[] = [];
  for (const item of extractedRelationships) {
    const srcId = labelToIdMap.get(item.sourceLabel?.toLowerCase());
    const tgtId = labelToIdMap.get(item.targetLabel?.toLowerCase());
    if (!srcId || !tgtId || srcId === tgtId) continue;
    const newRel: InvestigationRelationship = {
      id: genId('rel'),
      caseId,
      sourceId: srcId,
      targetId: tgtId,
      predicate: item.predicate || 'ASSOCIATED_WITH',
      label: item.label || item.predicate,
      weight: item.weight || 1,
      confidence: item.confidence || 0.75,
      status: 'ai_inferred',
      threadColor: item.threadColor || 'crimson',
      provenance: {
        sourceId: 'ai_extraction',
        sourceType: 'fir',
        sourceTitle: docMeta.title,
        excerpt: item.excerpt,
        confidence: item.confidence || 0.75,
      },
      notes: item.notes,
      manuallyConfirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertRelationship(newRel);
    addedRelationships.push(newRel);
  }

  const addedEvents: InvestigationTimelineEvent[] = [];
  for (const ev of extractedEvents || []) {
    const involvedIds = (ev.entitiesInvolved || [])
      .map((lbl: string) => labelToIdMap.get(lbl.toLowerCase()))
      .filter((id: string | undefined): id is string => Boolean(id));
    const timestamp =
      ev.timestamp && !Number.isNaN(new Date(ev.timestamp).getTime())
        ? new Date(ev.timestamp).toISOString()
        : new Date().toISOString();
    const newEvent: InvestigationTimelineEvent = {
      id: genId('ev'),
      caseId,
      timestamp,
      title: ev.description ? String(ev.description).slice(0, 90) : 'Extracted event',
      category: ev.category || 'surveillance',
      description: ev.description || '',
      involvedEntityIds: Array.from(new Set(involvedIds)),
      source: 'ai_extraction',
      sourceRefId: docMeta.title,
      createdAt: new Date().toISOString(),
    };
    await upsertTimelineEvent(newEvent);
    addedEvents.push(newEvent);
  }

  const doc: IngestedDocument = {
    id: genId('doc'),
    caseId,
    title: docMeta.title,
    documentType: docMeta.documentType as IngestedDocument['documentType'],
    rawText: docMeta.rawText || '',
    summary: docMeta.summary,
    extractionStatus: 'confirmed',
    extractedEntitiesCount: addedEntities.length,
    extractedRelationshipsCount: addedRelationships.length,
    importedAt: new Date().toISOString(),
  };
  await upsertDocument(doc);

  return { addedEntities, addedRelationships, addedEvents, updatedEntities, document: doc };
}

// ----------------- Import & seed -----------------

export async function importBundle(raw: unknown, existingIds?: Set<string>): Promise<{ bundle: CaseBundle; renamed: boolean; message: string }> {
  const bundle = validateBundle(raw);
  const ids = existingIds ?? new Set((await listCases()).map((s) => s.caseItem.id));
  const plan = planImport(bundle, ids);

  await upsertCase(plan.bundle.caseItem);
  for (const e of plan.bundle.entities) await upsertEntity(e);
  for (const r of plan.bundle.relationships) await upsertRelationship(r);
  for (const d of plan.bundle.documents) await upsertDocument(d);
  for (const ev of plan.bundle.timelineEvents) await upsertTimelineEvent(ev);

  return {
    bundle: plan.bundle,
    renamed: plan.renamed,
    message: plan.renamed
      ? `Imported as "${plan.bundle.caseItem.title}" (original case id existed).`
      : `Imported case "${plan.bundle.caseItem.title}".`,
  };
}

export async function seedDatabase(force = false): Promise<{ seeded: boolean; caseId: string }> {
  const cases = await listCases();
  if (cases.length > 0 && !force) {
    return { seeded: false, caseId: cases[0].caseItem.id };
  }
  await upsertCase(SEED_CASE);
  for (const ent of SEED_ENTITIES) await upsertEntity(ent);
  for (const rel of SEED_RELATIONSHIPS) await upsertRelationship(rel);
  return { seeded: true, caseId: SEED_CASE.id };
}

export async function graphStatus(): Promise<{
  online: boolean;
  caseCount: number;
  entityCount: number;
  relationshipCount: number;
}> {
  const { records } = await run(
    `OPTIONAL MATCH (c:Case) WITH count(DISTINCT c) AS caseCount
     OPTIONAL MATCH (e:Entity) WITH caseCount, count(e) AS entityCount
     OPTIONAL MATCH (a:Entity)-[r]->(b:Entity)
     RETURN caseCount, entityCount, count(r) AS relationshipCount`
  );
  const row = records[0];
  return {
    online: true,
    caseCount: Number(row.get('caseCount')),
    entityCount: Number(row.get('entityCount')),
    relationshipCount: Number(row.get('relationshipCount')),
  };
}
