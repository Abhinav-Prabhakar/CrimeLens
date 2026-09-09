import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
  RelationPredicate,
} from '../types/investigation';

/**
 * Temporal Analysis Engine
 * Derives a real investigation chronology from case data (relationships, documents,
 * the incident anchor and committed AI extraction events) — no hardcoded demo content.
 *
 * Also powers the temporal scrubber (network state as-of any point in time) and the
 * pre/post incident comparison statistics.
 */

export type EventCategory = InvestigationTimelineEvent['category'];

interface DerivedEvent {
  id: string;
  timestamp: string;
  title: string;
  category: EventCategory;
  description: string;
  involvedEntityIds: string[];
  source: InvestigationTimelineEvent['source'];
  sourceRefId?: string;
}

const CATEGORY_BY_PREDICATE: Record<RelationPredicate, EventCategory> = {
  CALLED: 'communication',
  COMMUNICATED_WITH: 'communication',
  TRANSFERRED_FUNDS: 'financial',
  LOCATED_AT: 'surveillance',
  TRAVELED_TO: 'surveillance',
  SUSPECTED_IN: 'incident',
  PARTICIPATED_IN: 'incident',
  MENTIONED_IN: 'document',
  KNOWS: 'surveillance',
  OWNS: 'surveillance',
  OWNS_DEVICE: 'surveillance',
  WORKS_FOR: 'surveillance',
  OPERATES_AT: 'surveillance',
  ASSOCIATED_WITH: 'surveillance',
};

function categoryForRelationship(rel: InvestigationRelationship): EventCategory {
  if (rel.provenance?.sourceType === 'forensic') return 'forensic';
  return CATEGORY_BY_PREDICATE[rel.predicate] ?? 'surveillance';
}

function relationshipTimestamp(rel: InvestigationRelationship): string | null {
  if (rel.validFrom && !Number.isNaN(new Date(rel.validFrom).getTime())) return rel.validFrom;
  if (rel.provenance?.timestamp && !Number.isNaN(new Date(rel.provenance.timestamp).getTime())) {
    return rel.provenance.timestamp;
  }
  if (rel.createdAt && !Number.isNaN(new Date(rel.createdAt).getTime())) return rel.createdAt;
  return null;
}

/**
 * Build the full investigation chronology from case records.
 * Timestamp resolution per relationship: evidential time (validFrom) → provenance
 * timestamp → record-entry time (createdAt). Record-entry anchoring is real case-file
 * metadata — the chronology never invents dates.
 */
export function buildTimeline(
  activeCase: InvestigationCase | null,
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  documents: IngestedDocument[],
  storedEvents: InvestigationTimelineEvent[]
): DerivedEvent[] {
  const entityLabel = new Map(entities.map((e) => [e.id, e.label]));
  const events: DerivedEvent[] = [];

  // 1. Incident anchor
  if (activeCase?.incidentDate && !Number.isNaN(new Date(activeCase.incidentDate).getTime())) {
    events.push({
      id: 'ev_incident_anchor',
      timestamp: activeCase.incidentDate,
      title: `INCIDENT ANCHOR: ${activeCase.title}`,
      category: 'incident',
      description:
        activeCase.description ||
        'Reference incident defining the pre/post investigation split for this case.',
      involvedEntityIds: [],
      source: 'incident_anchor',
    });
  }

  // 2. One event per temporally locatable relationship
  for (const rel of relationships) {
    const ts = relationshipTimestamp(rel);
    if (!ts) continue;
    const src = entityLabel.get(rel.sourceId) || rel.sourceId;
    const tgt = entityLabel.get(rel.targetId) || rel.targetId;
    events.push({
      id: `ev_rel_${rel.id}`,
      timestamp: ts,
      title: `${src} —[${rel.label || rel.predicate}]→ ${tgt}`,
      category: categoryForRelationship(rel),
      description:
        rel.notes ||
        rel.provenance?.excerpt ||
        `${rel.predicate} recorded between ${src} and ${tgt} (confidence ${(rel.confidence * 100).toFixed(0)}%).`,
      involvedEntityIds: [rel.sourceId, rel.targetId],
      source: 'relationship',
      sourceRefId: rel.id,
    });
  }

  // 3. Document ingestion receipts
  for (const doc of documents) {
    events.push({
      id: `ev_doc_${doc.id}`,
      timestamp: doc.importedAt,
      title: `Evidence ingested: ${doc.title}`,
      category: 'document',
      description: `${doc.documentType.toUpperCase()} entered case records${
        doc.extractedEntitiesCount ? ` — ${doc.extractedEntitiesCount} entities staged` : ''
      }.`,
      involvedEntityIds: [],
      source: 'document',
      sourceRefId: doc.id,
    });
  }

  // 4. Committed AI extraction / manually pinned events
  for (const ev of storedEvents) {
    if (Number.isNaN(new Date(ev.timestamp).getTime())) continue;
    events.push({
      id: ev.id,
      timestamp: ev.timestamp,
      title: ev.title,
      category: ev.category,
      description: ev.description,
      involvedEntityIds: ev.involvedEntityIds.filter((id) => entityLabel.has(id)),
      source: ev.source,
      sourceRefId: ev.sourceRefId,
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}

export interface NetworkStateAtTime {
  activeEntityIds: string[];
  activeRelationshipIds: string[];
  dominantHubId: string | null;
  dominantHubLabel: string | null;
  dominantHubDegree: number;
}

/**
 * Compute the state of the knowledge graph as of a point in time:
 * an edge is active once its earliest evidence timestamp has occurred,
 * a node once it participates in any active edge (or its own record existed).
 */
export function networkStateAtTime(
  asOf: string,
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[]
): NetworkStateAtTime {
  const t = new Date(asOf).getTime();

  const activeRelIds = relationships
    .filter((rel) => {
      const ts = relationshipTimestamp(rel);
      return ts !== null && new Date(ts).getTime() <= t;
    })
    .map((rel) => rel.id);

  const activeRelSet = new Set(activeRelIds);
  const degree = new Map<string, number>();
  for (const rel of relationships) {
    if (!activeRelSet.has(rel.id)) continue;
    degree.set(rel.sourceId, (degree.get(rel.sourceId) || 0) + 1);
    degree.set(rel.targetId, (degree.get(rel.targetId) || 0) + 1);
  }

  const entityById = new Map(entities.map((e) => [e.id, e]));
  let hubId: string | null = null;
  let hubDegree = 0;
  for (const [id, deg] of degree.entries()) {
    if (deg > hubDegree && entityById.has(id)) {
      hubDegree = deg;
      hubId = id;
    }
  }

  return {
    activeEntityIds: Array.from(degree.keys()),
    activeRelationshipIds: activeRelIds,
    dominantHubId: hubId,
    dominantHubLabel: hubId ? entityById.get(hubId)?.label ?? null : null,
    dominantHubDegree: hubDegree,
  };
}

export interface PhaseStats {
  entityCount: number;
  relationshipCount: number;
  dominantHubLabel: string | null;
  dominantHubDegree: number;
  topCategories: { category: EventCategory; count: number }[];
}

function phaseStats(
  events: DerivedEvent[],
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  from: number,
  to: number
): PhaseStats {
  const inWindow = events.filter((ev) => {
    const t = new Date(ev.timestamp).getTime();
    return t > from && t <= to;
  });

  const relIds = new Set(
    inWindow.filter((e) => e.source === 'relationship').map((e) => e.sourceRefId || '')
  );
  const activeRels = relationships.filter((r) => relIds.has(r.id));

  const degree = new Map<string, number>();
  for (const rel of activeRels) {
    degree.set(rel.sourceId, (degree.get(rel.sourceId) || 0) + 1);
    degree.set(rel.targetId, (degree.get(rel.targetId) || 0) + 1);
  }
  const entityById = new Map(entities.map((e) => [e.id, e]));
  let hubLabel: string | null = null;
  let hubDegree = 0;
  for (const [id, deg] of degree.entries()) {
    if (deg > hubDegree && entityById.has(id)) {
      hubDegree = deg;
      hubLabel = entityById.get(id)!.label;
    }
  }

  const catCounts = new Map<EventCategory, number>();
  for (const ev of inWindow) catCounts.set(ev.category, (catCounts.get(ev.category) || 0) + 1);
  const topCategories = Array.from(catCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    entityCount: degree.size,
    relationshipCount: activeRels.length,
    dominantHubLabel: hubLabel,
    dominantHubDegree: hubDegree,
    topCategories,
  };
}

/**
 * Pre-incident vs post-incident comparison, computed from derived events.
 * Pre window: (incident - 90 days, incident]; Post window: (incident, incident + 90 days].
 */
export function beforeAfterStats(
  incidentDate: string | undefined,
  events: DerivedEvent[],
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[]
): { before: PhaseStats; after: PhaseStats } | null {
  if (!incidentDate) return null;
  const incident = new Date(incidentDate).getTime();
  if (Number.isNaN(incident)) return null;
  const windowMs = 90 * 24 * 3600 * 1000;
  return {
    before: phaseStats(events, entities, relationships, incident - windowMs, incident),
    after: phaseStats(events, entities, relationships, incident, incident + windowMs),
  };
}
