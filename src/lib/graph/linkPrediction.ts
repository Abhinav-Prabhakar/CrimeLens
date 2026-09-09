import { InvestigationEntity, InvestigationRelationship } from '../types/investigation';

export interface PredictedLink {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  predictedPredicate: string;
  score: number; // 0.0 - 1.0
  jaccard: number;
  resourceAllocation: number;
  adamicAdar: number;
  commonNeighborIds: string[];
  commonNeighborLabels: string[];
  reasons: string[];
}

/**
 * Topological Link Prediction Engine
 * Identifies covert/unrecorded associations between suspects and organizations.
 * Adapted from CrimeLens and ROXANNE criminal network heuristics.
 */
export function predictMissingLinks(
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  topK: number = 8
): PredictedLink[] {
  const entityMap = new Map<string, InvestigationEntity>();
  entities.forEach((e) => entityMap.set(e.id, e));

  // Build existing undirected edge set
  const existingEdges = new Set<string>();
  const neighbors = new Map<string, Set<string>>();

  for (const ent of entities) {
    neighbors.set(ent.id, new Set());
  }

  for (const rel of relationships) {
    const k1 = `${rel.sourceId}--${rel.targetId}`;
    const k2 = `${rel.targetId}--${rel.sourceId}`;
    existingEdges.add(k1);
    existingEdges.add(k2);

    if (neighbors.has(rel.sourceId)) neighbors.get(rel.sourceId)!.add(rel.targetId);
    if (neighbors.has(rel.targetId)) neighbors.get(rel.targetId)!.add(rel.sourceId);
  }

  const nodeIds = entities.map((e) => e.id);
  const candidates: PredictedLink[] = [];

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const u = nodeIds[i];
      const v = nodeIds[j];

      if (existingEdges.has(`${u}--${v}`)) continue;

      const nU = neighbors.get(u)!;
      const nV = neighbors.get(v)!;

      // Common neighbors
      const common: string[] = [];
      for (const w of nU) {
        if (nV.has(w)) common.push(w);
      }

      if (common.length === 0) continue;

      // Jaccard Coefficient = |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
      const unionSize = new Set([...nU, ...nV]).size;
      const jaccard = unionSize > 0 ? common.length / unionSize : 0;

      // Resource Allocation (RA) = sum(1 / |N(z)|) for z in common
      let ra = 0;
      // Adamic-Adar (AA) = sum(1 / log(|N(z)|)) for z in common
      let aa = 0;

      for (const z of common) {
        const degZ = neighbors.get(z)?.size || 1;
        ra += 1 / degZ;
        if (degZ > 1) {
          aa += 1 / Math.log(degZ);
        }
      }

      // Composite prediction confidence
      const compositeScore = Math.min(
        0.98,
        Number((jaccard * 0.4 + Math.min(1, ra) * 0.35 + Math.min(1, aa / 3) * 0.25).toFixed(4))
      );

      if (compositeScore >= 0.15) {
        const uEnt = entityMap.get(u)!;
        const vEnt = entityMap.get(v)!;

        const reasons: string[] = [
          `${common.length} shared mutual contact${common.length > 1 ? 's' : ''}`,
          `High local network overlap (Jaccard: ${(jaccard * 100).toFixed(0)}%)`,
        ];

        // Attribute correlation
        if (uEnt.attributes?.location && uEnt.attributes.location === vEnt.attributes?.location) {
          reasons.push(`Shared geographic jurisdiction: ${uEnt.attributes.location}`);
        }

        candidates.push({
          sourceId: u,
          targetId: v,
          sourceLabel: uEnt.label,
          targetLabel: vEnt.label,
          predictedPredicate: 'ASSOCIATED_WITH',
          score: compositeScore,
          jaccard: Number(jaccard.toFixed(3)),
          resourceAllocation: Number(ra.toFixed(3)),
          adamicAdar: Number(aa.toFixed(3)),
          commonNeighborIds: common,
          commonNeighborLabels: common.map((cid) => entityMap.get(cid)?.label || cid),
          reasons,
        });
      }
    }
  }

  // Sort by composite score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}
