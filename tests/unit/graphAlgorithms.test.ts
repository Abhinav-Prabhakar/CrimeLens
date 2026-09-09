import { describe, it, expect } from 'vitest';
import { GraphEngine } from '../../src/lib/graph/algorithms';
import { detectCommunities } from '../../src/lib/graph/louvain';
import { predictMissingLinks } from '../../src/lib/graph/linkPrediction';
import { InvestigationEntity, InvestigationRelationship } from '../../src/lib/types/investigation';

const mockEntity = (id: string, label: string, type: any = 'person'): InvestigationEntity => ({
  id,
  caseId: 'case_1',
  type,
  label,
  aliases: [],
  attributes: {},
  confidence: 0.9,
  status: 'verified_source',
  provenance: {
    sourceId: 'src_1',
    sourceType: 'fir',
    sourceTitle: 'FIR #102/2026',
    confidence: 0.9,
  },
  boardPosition: { x: 0, y: 0 },
  visualType: 'suspect',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const mockRel = (
  id: string,
  sourceId: string,
  targetId: string,
  confidence: number = 0.8
): InvestigationRelationship => ({
  id,
  caseId: 'case_1',
  sourceId,
  targetId,
  predicate: 'CALLED',
  weight: 1,
  confidence,
  status: 'verified_source',
  threadColor: 'crimson',
  provenance: {
    sourceId: 'src_1',
    sourceType: 'cdr',
    sourceTitle: 'CDR Log',
    confidence,
  },
  manuallyConfirmed: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Graph Algorithms Suite', () => {
  it('should find the shortest path between suspects in a chain (A -> B -> C)', () => {
    const entities = [
      mockEntity('A', 'Alice'),
      mockEntity('B', 'Bob'),
      mockEntity('C', 'Charlie'),
      mockEntity('D', 'David'),
    ];
    const rels = [
      mockRel('r1', 'A', 'B'),
      mockRel('r2', 'B', 'C'),
      mockRel('r3', 'C', 'D'),
    ];

    const engine = new GraphEngine(entities, rels);
    const result = engine.findShortestPath('A', 'C');

    expect(result.found).toBe(true);
    expect(result.path).toEqual(['A', 'B', 'C']);
    expect(result.relationships.length).toBe(2);
  });

  it('should return found=false for disconnected suspects', () => {
    const entities = [
      mockEntity('A', 'Alice'),
      mockEntity('B', 'Bob'),
      mockEntity('Isolated', 'Zack'),
    ];
    const rels = [mockRel('r1', 'A', 'B')];

    const engine = new GraphEngine(entities, rels);
    const result = engine.findShortestPath('A', 'Isolated');

    expect(result.found).toBe(false);
    expect(result.path).toEqual([]);
  });

  it('should calculate degree centrality and betweenness centrality identifying bridge nodes', () => {
    // Star graph: Hub 'H' connected to 1, 2, 3, 4
    const entities = [
      mockEntity('H', 'Hub'),
      mockEntity('1', 'Node 1'),
      mockEntity('2', 'Node 2'),
      mockEntity('3', 'Node 3'),
      mockEntity('4', 'Node 4'),
    ];
    const rels = [
      mockRel('r1', '1', 'H'),
      mockRel('r2', '2', 'H'),
      mockRel('r3', '3', 'H'),
      mockRel('r4', '4', 'H'),
    ];

    const engine = new GraphEngine(entities, rels);
    const degree = engine.calculateDegreeCentrality();
    const betweenness = engine.calculateBetweennessCentrality();

    expect(degree.totalDegree['H']).toBe(4);
    expect(degree.totalDegree['1']).toBe(1);

    // Node H has the highest betweenness
    expect(betweenness['H']).toBeGreaterThan(betweenness['1']);
    expect(betweenness['1']).toBe(0);
  });

  it('should detect modular communities with Louvain / label propagation', () => {
    // Two distinct clusters: {C1_A, C1_B, C1_C} and {C2_X, C2_Y, C2_Z}
    const entities = [
      mockEntity('A', 'A'),
      mockEntity('B', 'B'),
      mockEntity('C', 'C'),
      mockEntity('X', 'X'),
      mockEntity('Y', 'Y'),
      mockEntity('Z', 'Z'),
    ];
    const rels = [
      // Cluster 1
      mockRel('r1', 'A', 'B'),
      mockRel('r2', 'B', 'C'),
      mockRel('r3', 'A', 'C'),
      // Cluster 2
      mockRel('r4', 'X', 'Y'),
      mockRel('r5', 'Y', 'Z'),
      mockRel('r6', 'X', 'Z'),
    ];

    const comm = detectCommunities(entities, rels);
    expect(comm.communityCount).toBeGreaterThanOrEqual(2);
    expect(comm.communities['A']).toBe(comm.communities['B']);
    expect(comm.communities['X']).toBe(comm.communities['Y']);
    expect(comm.communities['A']).not.toBe(comm.communities['X']);
  });

  it('should predict missing links using Jaccard and Adamic-Adar', () => {
    // Diamond structure without horizontal edge:
    // A connected to C and D; B connected to C and D.
    // Prediction should suggest A-B edge!
    const entities = [
      mockEntity('A', 'Suspect A'),
      mockEntity('B', 'Suspect B'),
      mockEntity('C', 'Broker C'),
      mockEntity('D', 'Broker D'),
    ];
    const rels = [
      mockRel('r1', 'A', 'C'),
      mockRel('r2', 'A', 'D'),
      mockRel('r3', 'B', 'C'),
      mockRel('r4', 'B', 'D'),
    ];

    const predictions = predictMissingLinks(entities, rels);
    expect(predictions.length).toBeGreaterThan(0);

    const top = predictions[0];
    expect(
      (top.sourceId === 'A' && top.targetId === 'B') ||
      (top.sourceId === 'B' && top.targetId === 'A')
    ).toBe(true);
    expect(top.commonNeighborIds).toContain('C');
    expect(top.commonNeighborIds).toContain('D');
    expect(top.score).toBeGreaterThan(0.5);
  });
});
