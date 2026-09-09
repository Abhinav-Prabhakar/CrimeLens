import { InvestigationEntity, InvestigationRelationship } from '../types/investigation';

export interface CommunityDetectionResult {
  communities: Record<string, number>; // entityId -> communityIndex
  communityCount: number;
  modularity: number;
}

/**
 * Deterministic seeded shuffle (mulberry32 LCG).
 * Community assignment must be stable across runs of the same case — an evidential
 * tool cannot present different syndicate partitions on every refresh.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * High-performance Modularity-based Community Detection (Label Propagation / Louvain heuristic)
 * Partitions the criminal network into tightly interconnected clusters/gangs/cells.
 */
export function detectCommunities(
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  maxIterations: number = 20,
  seed: number = 1337
): CommunityDetectionResult {
  const nodeIds = entities.map((e) => e.id);
  if (nodeIds.length === 0) {
    return { communities: {}, communityCount: 0, modularity: 0 };
  }

  // Build adjacency list
  const adj = new Map<string, Map<string, number>>();
  for (const id of nodeIds) adj.set(id, new Map());

  let totalWeight = 0;
  for (const rel of relationships) {
    const w = Math.max(0.2, rel.confidence || 1.0);
    if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, new Map());
    if (!adj.has(rel.targetId)) adj.set(rel.targetId, new Map());

    const cur1 = adj.get(rel.sourceId)!.get(rel.targetId) || 0;
    adj.get(rel.sourceId)!.set(rel.targetId, cur1 + w);

    const cur2 = adj.get(rel.targetId)!.get(rel.sourceId) || 0;
    adj.get(rel.targetId)!.set(rel.sourceId, cur2 + w);

    totalWeight += w;
  }

  // Initialize each node in its own community
  const community = new Map<string, number>();
  nodeIds.forEach((id, idx) => community.set(id, idx));

  // Label Propagation with edge weights
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = 0;
    // Deterministic node order (seeded shuffle for label-propagation symmetry breaking)
    const shuffled = seededShuffle(nodeIds, seed + iter);

    for (const u of shuffled) {
      const neighbors = adj.get(u);
      if (!neighbors || neighbors.size === 0) continue;

      // Sum weights per community
      const labelWeights = new Map<number, number>();
      for (const [v, weight] of neighbors.entries()) {
        const comm = community.get(v)!;
        labelWeights.set(comm, (labelWeights.get(comm) || 0) + weight);
      }

      // Pick dominant community
      let bestComm = community.get(u)!;
      let maxW = -1;
      for (const [comm, weight] of labelWeights.entries()) {
        if (weight > maxW) {
          maxW = weight;
          bestComm = comm;
        }
      }

      if (bestComm !== community.get(u)) {
        community.set(u, bestComm);
        changed++;
      }
    }

    if (changed === 0) break;
  }

  // Renumber communities 0..k-1
  const uniqueLabels = Array.from(new Set(community.values()));
  const labelMap = new Map<number, number>();
  uniqueLabels.forEach((lbl, idx) => labelMap.set(lbl, idx));

  const result: Record<string, number> = {};
  for (const [id, comm] of community.entries()) {
    result[id] = labelMap.get(comm)!;
  }

  // Calculate Newman-Girvan Modularity Q
  let modularity = 0;
  if (totalWeight > 0) {
    const nodeDegree = new Map<string, number>();
    for (const [u, neighbors] of adj.entries()) {
      let deg = 0;
      for (const w of neighbors.values()) deg += w;
      nodeDegree.set(u, deg);
    }

    const m2 = 2 * totalWeight;
    for (const u of nodeIds) {
      const neighbors = adj.get(u);
      for (const v of nodeIds) {
        if (result[u] === result[v]) {
          const A_uv = neighbors?.get(v) || 0;
          const k_u = nodeDegree.get(u) || 0;
          const k_v = nodeDegree.get(v) || 0;
          modularity += A_uv - (k_u * k_v) / m2;
        }
      }
    }
    modularity = Number((modularity / m2).toFixed(4));
  }

  return {
    communities: result,
    communityCount: uniqueLabels.length,
    modularity: Math.max(-1, Math.min(1, modularity)),
  };
}
