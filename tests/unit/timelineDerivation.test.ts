import { describe, it, expect } from 'vitest';
import { buildTimeline, networkStateAtTime, beforeAfterStats } from '../../src/lib/temporal/timeline';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  InvestigationTimelineEvent,
} from '../../src/lib/types/investigation';

const ent = (id: string, label: string): InvestigationEntity => ({
  id,
  caseId: 'case_1',
  type: 'person',
  label,
  aliases: [],
  attributes: {},
  confidence: 0.9,
  status: 'verified_source',
  provenance: { sourceId: 's', sourceType: 'fir', sourceTitle: 'T', confidence: 0.9 },
  boardPosition: { x: 0, y: 0 },
  visualType: 'suspect',
  tags: [],
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
});

const rel = (
  id: string,
  sourceId: string,
  targetId: string,
  predicate: InvestigationRelationship['predicate'],
  validFrom?: string
): InvestigationRelationship => ({
  id,
  caseId: 'case_1',
  sourceId,
  targetId,
  predicate,
  label: predicate,
  weight: 1,
  confidence: 0.9,
  status: 'verified_source',
  threadColor: 'crimson',
  validFrom,
  provenance: { sourceId: 's', sourceType: 'cdr', sourceTitle: 'T', confidence: 0.9 },
  manuallyConfirmed: true,
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
});

const testCase: InvestigationCase = {
  id: 'case_1',
  title: 'Timeline Test',
  caseNumber: 'CR-1',
  description: 'test',
  status: 'active',
  priority: 'high',
  leadInvestigator: 'X',
  jurisdiction: 'X',
  incidentDate: '2026-09-01T12:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  tags: [],
};

describe('Temporal Analysis Engine', () => {
  const entities = [ent('a', 'Alice'), ent('b', 'Bob'), ent('c', 'Cara')];
  const relationships = [
    rel('r1', 'a', 'b', 'COMMUNICATED_WITH', '2026-08-30T10:00:00Z'), // pre-incident
    rel('r2', 'b', 'c', 'TRANSFERRED_FUNDS', '2026-09-03T10:00:00Z'), // post-incident
    rel('r3', 'a', 'c', 'KNOWS'), // no temporal data — must be excluded
  ];
  const docs: IngestedDocument[] = [
    {
      id: 'doc1',
      caseId: 'case_1',
      title: 'FIR 100',
      documentType: 'fir',
      rawText: 'text',
      extractionStatus: 'confirmed',
      importedAt: '2026-09-02T08:00:00Z',
    },
  ];
  const stored: InvestigationTimelineEvent[] = [
    {
      id: 'ev1',
      caseId: 'case_1',
      timestamp: '2026-08-29T09:00:00Z',
      title: 'AI event',
      category: 'surveillance',
      description: 'Meeting observed',
      involvedEntityIds: ['a', 'b'],
      source: 'ai_extraction',
      createdAt: '2026-09-02T00:00:00Z',
    },
  ];

  it('derives a chronology from relationships, documents, the anchor and committed AI events', () => {
    const events = buildTimeline(testCase, entities, relationships, docs, stored);

    expect(events.some((e) => e.id === 'ev_incident_anchor')).toBe(true);
    expect(events.some((e) => e.id === 'ev_rel_r1')).toBe(true);
    expect(events.some((e) => e.id === 'ev_rel_r2')).toBe(true);
    expect(events.some((e) => e.id === 'ev_doc_doc1')).toBe(true);
    expect(events.some((e) => e.id === 'ev1')).toBe(true);

    // Untimestamped relationships anchor to their record-entry time (createdAt) —
    // real case-file metadata, never an invented evidential date
    const r3Event = events.find((e) => e.id === 'ev_rel_r3');
    expect(r3Event).toBeDefined();
    expect(r3Event?.timestamp).toBe('2026-09-05T00:00:00Z');

    // Sorted chronologically
    const times = events.map((e) => new Date(e.timestamp).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('categorizes events by predicate semantics', () => {
    const events = buildTimeline(testCase, entities, relationships, docs, stored);
    expect(events.find((e) => e.id === 'ev_rel_r1')?.category).toBe('communication');
    expect(events.find((e) => e.id === 'ev_rel_r2')?.category).toBe('financial');
    expect(events.find((e) => e.id === 'ev_doc_doc1')?.category).toBe('document');
  });

  it('computes network state as-of any point in time for the scrubber', () => {
    // Before anything: empty graph
    const before = networkStateAtTime('2026-08-01T00:00:00Z', entities, relationships);
    expect(before.activeRelationshipIds).toHaveLength(0);
    expect(before.dominantHubLabel).toBeNull();

    // After r1 only
    const mid = networkStateAtTime('2026-08-31T00:00:00Z', entities, relationships);
    expect(mid.activeRelationshipIds).toEqual(['r1']);
    expect(new Set(mid.activeEntityIds)).toEqual(new Set(['a', 'b']));
    expect(mid.dominantHubDegree).toBe(1);

    // After everything (r3 anchors to its Sep 5 record-entry time)
    const end = networkStateAtTime('2026-09-10T00:00:00Z', entities, relationships);
    expect(end.activeRelationshipIds).toHaveLength(3);
    expect(['a', 'b']).toContain(end.dominantHubId);
  });

  it('computes pre/post incident comparison statistics from real data', () => {
    const events = buildTimeline(testCase, entities, relationships, docs, stored);
    const stats = beforeAfterStats(testCase.incidentDate, events, entities, relationships)!;

    expect(stats.before.relationshipCount).toBe(1); // r1 pre-incident
    expect(stats.after.relationshipCount).toBe(2); // r2 + r3 (record-entry) post-incident
    expect(stats.before.topCategories.length).toBeGreaterThan(0);
    expect(stats.after).toBeDefined();
  });

  it('returns null comparison when no incident anchor exists', () => {
    const events = buildTimeline({ ...testCase, incidentDate: undefined }, entities, relationships, docs, stored);
    expect(beforeAfterStats(undefined, events, entities, relationships)).toBeNull();
  });
});
