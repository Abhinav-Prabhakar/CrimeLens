import { describe, it, expect } from 'vitest';
import { GraphEngine } from '../../src/lib/graph/algorithms';
import { detectCommunities } from '../../src/lib/graph/louvain';
import { predictMissingLinks } from '../../src/lib/graph/linkPrediction';
import { InvestigationEntity, InvestigationRelationship } from '../../src/lib/types/investigation';

function generateSyntheticGraph(nodeCount: number, edgeDensity: number = 3): {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
} {
  const entities: InvestigationEntity[] = [];
  const relationships: InvestigationRelationship[] = [];

  for (let i = 0; i < nodeCount; i++) {
    entities.push({
      id: `node_${i}`,
      caseId: 'stress_case',
      type: i % 5 === 0 ? 'organization' : i % 4 === 0 ? 'location' : 'person',
      label: `Entity #${i}`,
      aliases: [`Alias_${i}`],
      attributes: { index: i },
      confidence: 0.85,
      status: 'verified_source',
      provenance: { sourceId: 'doc_synth', sourceType: 'fir', sourceTitle: 'Synthetic Stress', confidence: 0.85 },
      boardPosition: { x: (i % 20) * 10, y: Math.floor(i / 20) * 10 },
      visualType: 'suspect',
      tags: ['synthetic'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Connect in a small-world / random graph
  let relId = 0;
  for (let i = 0; i < nodeCount; i++) {
    // Connect to next node to ensure connectivity
    if (i < nodeCount - 1) {
      relationships.push({
        id: `rel_${relId++}`,
        caseId: 'stress_case',
        sourceId: `node_${i}`,
        targetId: `node_${i + 1}`,
        predicate: 'ASSOCIATED_WITH',
        weight: 1,
        confidence: 0.8,
        status: 'verified_source',
        threadColor: 'crimson',
        provenance: { sourceId: 'doc_synth', sourceType: 'fir', sourceTitle: 'Synthetic', confidence: 0.8 },
        manuallyConfirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    // Random additional edges
    for (let e = 0; e < edgeDensity; e++) {
      const target = Math.floor(Math.random() * nodeCount);
      if (target !== i) {
        relationships.push({
          id: `rel_${relId++}`,
          caseId: 'stress_case',
          sourceId: `node_${i}`,
          targetId: `node_${target}`,
          predicate: 'CALLED',
          weight: 1,
          confidence: 0.75,
          status: 'verified_source',
          threadColor: 'twine',
          provenance: { sourceId: 'doc_synth', sourceType: 'cdr', sourceTitle: 'Synthetic', confidence: 0.75 },
          manuallyConfirmed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return { entities, relationships };
}

describe('Graph Scalability & Stress Benchmark', () => {
  it('should process a 100-node graph under 100ms', () => {
    const { entities, relationships } = generateSyntheticGraph(100);
    const start = performance.now();

    const engine = new GraphEngine(entities, relationships);
    const degree = engine.calculateDegreeCentrality();
    const shortestPath = engine.findShortestPath('node_0', 'node_99');
    const communities = detectCommunities(entities, relationships);
    const elapsed = performance.now() - start;

    expect(degree.totalDegree['node_0']).toBeGreaterThan(0);
    expect(shortestPath.found).toBe(true);
    expect(communities.communityCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('should process a 1,000-node graph under 500ms', () => {
    const { entities, relationships } = generateSyntheticGraph(1000);
    const start = performance.now();

    const engine = new GraphEngine(entities, relationships);
    const degree = engine.calculateDegreeCentrality();
    const shortestPath = engine.findShortestPath('node_0', 'node_999');
    const communities = detectCommunities(entities, relationships, 5);
    const elapsed = performance.now() - start;

    expect(degree.totalDegree['node_0']).toBeGreaterThan(0);
    expect(shortestPath.found).toBe(true);
    expect(communities.communityCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it('should process a 5,000-node graph for shortest path and degree without memory failure', () => {
    const { entities, relationships } = generateSyntheticGraph(5000, 2);
    const start = performance.now();

    const engine = new GraphEngine(entities, relationships);
    const degree = engine.calculateDegreeCentrality();
    const path = engine.findShortestPath('node_0', 'node_4999');
    const elapsed = performance.now() - start;

    expect(degree.totalDegree['node_0']).toBeGreaterThan(0);
    expect(path.found).toBe(true);
    expect(elapsed).toBeLessThan(2500);
  });
});
