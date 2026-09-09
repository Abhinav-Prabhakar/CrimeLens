import { describe, it, expect } from 'vitest';
import {
  computeCasePriority,
  computeCasePriorityFromCounts,
  rankCaseSummaries,
  DEFAULT_PRIORITIZATION_WEIGHTS,
} from '../../src/lib/cases/prioritization';
import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '../../src/lib/types/investigation';

const mockCase = (overrides: Partial<InvestigationCase> = {}): InvestigationCase => ({
  id: 'case_1',
  title: 'Test Case',
  caseNumber: 'CR-2026-0001',
  description: '',
  status: 'active',
  priority: 'medium',
  leadInvestigator: 'Inspector Test',
  jurisdiction: 'Test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  ...overrides,
});

const mockEntity = (id: string): InvestigationEntity => ({
  id,
  caseId: 'case_1',
  type: 'person',
  label: `Entity ${id}`,
  aliases: [],
  attributes: {},
  confidence: 0.9,
  status: 'verified_source',
  provenance: { sourceId: 's', sourceType: 'fir', sourceTitle: 'T', confidence: 0.9 },
  boardPosition: { x: 0, y: 0 },
  visualType: 'suspect',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emptyGraph = { entities: [] as InvestigationEntity[], relationships: [] as InvestigationRelationship[] };

describe('Case Prioritization Engine', () => {
  it('should score critical fresh cases above old low-priority sparse cases', () => {
    const critical = computeCasePriority(
      mockCase({ priority: 'critical', incidentDate: new Date().toISOString() }),
      [mockEntity('a'), mockEntity('b'), mockEntity('c')],
      []
    );
    const low = computeCasePriority(
      mockCase({ priority: 'low', incidentDate: '2020-01-01T00:00:00Z' }),
      [],
      []
    );

    expect(critical.score).toBeGreaterThan(low.score);
    expect(critical.score).toBeGreaterThan(0.4);
    expect(low.score).toBeLessThan(0.2);
  });

  it('should expose a transparent four-factor breakdown summing to the configured weights', () => {
    const result = computeCasePriority(mockCase({ priority: 'high', incidentDate: new Date().toISOString() }), [], []);
    expect(result.factors.map((f) => f.label)).toEqual([
      'Public Risk Severity',
      'Network Density',
      'Anomaly Load',
      'Urgency',
    ]);
    const weightSum = Object.values(DEFAULT_PRIORITIZATION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1.0);
  });

  it('should increase the score as network density grows', () => {
    const sparse = computeCasePriority(mockCase(), [], []);
    const dense = computeCasePriority(
      mockCase(),
      Array.from({ length: 40 }, (_, i) => mockEntity(`e${i}`)),
      []
    );
    expect(dense.score).toBeGreaterThan(sparse.score);
    expect(dense.factors.find((f) => f.label === 'Network Density')?.value).toBe(1);
  });

  it('should never exceed 1.0 or drop below 0', () => {
    const maxed = computeCasePriority(
      mockCase({ priority: 'critical', incidentDate: new Date().toISOString() }),
      Array.from({ length: 60 }, (_, i) => mockEntity(`e${i}`)),
      []
    );
    expect(maxed.score).toBeLessThanOrEqual(1);
    expect(maxed.score).toBeGreaterThanOrEqual(0);
  });

  it('should agree between array-based and counts-based scoring for the same graph', () => {
    const entities = Array.from({ length: 20 }, (_, i) => mockEntity(`e${i}`));
    const fromArrays = computeCasePriority(mockCase({ priority: 'high' }), entities, []);
    const fromCounts = computeCasePriorityFromCounts(mockCase({ priority: 'high' }), {
      entityCount: entities.length,
      relationshipCount: 0,
      anomalyCount: 0,
    });
    expect(fromCounts.score).toBeCloseTo(fromArrays.score, 2);
  });

  it('should rank portfolio summaries from Neo4j-side counts', () => {
    const critical = mockCase({ id: 'c1', title: 'Critical', priority: 'critical', incidentDate: new Date().toISOString() });
    const cold = mockCase({ id: 'c2', title: 'Cold', priority: 'low', incidentDate: '2020-01-01T00:00:00Z' });
    const ranked = rankCaseSummaries([
      { caseItem: cold, entityCount: 0, relationshipCount: 0, anomalyCount: 0 },
      { caseItem: critical, entityCount: 30, relationshipCount: 40, anomalyCount: 6 },
    ]);
    expect(ranked[0].caseItem.id).toBe('c1');
    expect(ranked[0].priority.factors).toHaveLength(4);
  });
});
