import { InvestigationEntity, InvestigationRelationship } from '../types/investigation';

export interface GraphPathResult {
  found: boolean;
  path: string[]; // Entity IDs
  distance: number;
  relationships: InvestigationRelationship[];
}

export interface DegreeCentralityResult {
  inDegree: Record<string, number>;
  outDegree: Record<string, number>;
  totalDegree: Record<string, number>;
  normalizedDegree: Record<string, number>;
}

export class GraphEngine {
  private entities: Map<string, InvestigationEntity> = new Map();
  private adj: Map<string, Map<string, InvestigationRelationship[]>> = new Map();
  private allRelationships: InvestigationRelationship[] = [];

  constructor(entities: InvestigationEntity[], relationships: InvestigationRelationship[]) {
    this.updateGraph(entities, relationships);
  }

  public updateGraph(entities: InvestigationEntity[], relationships: InvestigationRelationship[]) {
    this.entities.clear();
    this.adj.clear();
    this.allRelationships = relationships;

    for (const ent of entities) {
      this.entities.set(ent.id, ent);
      this.adj.set(ent.id, new Map());
    }

    for (const rel of relationships) {
      if (!this.adj.has(rel.sourceId)) this.adj.set(rel.sourceId, new Map());
      if (!this.adj.has(rel.targetId)) this.adj.set(rel.targetId, new Map());

      // Directed/bidirectional support
      const srcMap = this.adj.get(rel.sourceId)!;
      if (!srcMap.has(rel.targetId)) srcMap.set(rel.targetId, []);
      srcMap.get(rel.targetId)!.push(rel);

      const tgtMap = this.adj.get(rel.targetId)!;
      if (!tgtMap.has(rel.sourceId)) tgtMap.set(rel.sourceId, []);
      tgtMap.get(rel.sourceId)!.push(rel);
    }
  }

  /**
   * Find Shortest Path between startId and targetId using Dijkstra / BFS
   */
  public findShortestPath(startId: string, targetId: string): GraphPathResult {
    if (!this.entities.has(startId) || !this.entities.has(targetId)) {
      return { found: false, path: [], distance: Infinity, relationships: [] };
    }
    if (startId === targetId) {
      return { found: true, path: [startId], distance: 0, relationships: [] };
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, { node: string; rel: InvestigationRelationship }>();
    const queue = new Set<string>();

    for (const id of this.entities.keys()) {
      dist.set(id, Infinity);
      queue.add(id);
    }
    dist.set(startId, 0);

    while (queue.size > 0) {
      // Find min dist node in queue
      let u: string | null = null;
      let minDist = Infinity;
      for (const node of queue) {
        const d = dist.get(node) ?? Infinity;
        if (d < minDist) {
          minDist = d;
          u = node;
        }
      }

      if (u === null || minDist === Infinity || u === targetId) break;
      queue.delete(u);

      const neighbors = this.adj.get(u);
      if (!neighbors) continue;

      for (const [v, rels] of neighbors.entries()) {
        if (!queue.has(v)) continue;
        // Edge weight: inverse of relationship confidence/weight
        const bestRel = rels.reduce((a, b) => (a.confidence > b.confidence ? a : b));
        const cost = 1 / Math.max(0.1, bestRel.confidence);
        const alt = minDist + cost;

        if (alt < (dist.get(v) ?? Infinity)) {
          dist.set(v, alt);
          prev.set(v, { node: u, rel: bestRel });
        }
      }
    }

    if (!prev.has(targetId)) {
      return { found: false, path: [], distance: Infinity, relationships: [] };
    }

    const path: string[] = [];
    const relationships: InvestigationRelationship[] = [];
    let curr = targetId;

    while (curr !== startId) {
      path.unshift(curr);
      const step = prev.get(curr);
      if (!step) break;
      relationships.unshift(step.rel);
      curr = step.node;
    }
    path.unshift(startId);

    return {
      found: true,
      path,
      distance: dist.get(targetId) ?? path.length - 1,
      relationships,
    };
  }

  /**
   * Calculate Degree Centrality for all nodes
   */
  public calculateDegreeCentrality(): DegreeCentralityResult {
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    const totalDegree: Record<string, number> = {};
    const normalizedDegree: Record<string, number> = {};

    for (const id of this.entities.keys()) {
      inDegree[id] = 0;
      outDegree[id] = 0;
      totalDegree[id] = 0;
    }

    for (const rel of this.allRelationships) {
      if (outDegree[rel.sourceId] !== undefined) outDegree[rel.sourceId]++;
      if (inDegree[rel.targetId] !== undefined) inDegree[rel.targetId]++;
    }

    const n = this.entities.size;
    const maxPossible = Math.max(1, n - 1);

    for (const id of this.entities.keys()) {
      const neighbors = this.adj.get(id);
      const uniqueConnectedNeighbors = neighbors ? neighbors.size : 0;
      totalDegree[id] = uniqueConnectedNeighbors;
      normalizedDegree[id] = Number((uniqueConnectedNeighbors / maxPossible).toFixed(4));
    }

    return { inDegree, outDegree, totalDegree, normalizedDegree };
  }

  /**
   * Calculate Betweenness Centrality using Brandes' Algorithm (O(V*E))
   * Identifies bridge / intermediary entities.
   */
  public calculateBetweennessCentrality(): Record<string, number> {
    const nodes = Array.from(this.entities.keys());
    const CB: Record<string, number> = {};
    for (const v of nodes) CB[v] = 0;

    for (const s of nodes) {
      const S: string[] = [];
      const P: Map<string, string[]> = new Map();
      const sigma: Map<string, number> = new Map();
      const d: Map<string, number> = new Map();

      for (const w of nodes) {
        P.set(w, []);
        sigma.set(w, 0);
        d.set(w, -1);
      }

      sigma.set(s, 1);
      d.set(s, 0);

      const Q: string[] = [s];

      while (Q.length > 0) {
        const v = Q.shift()!;
        S.push(v);

        const neighbors = this.adj.get(v);
        if (!neighbors) continue;

        for (const w of neighbors.keys()) {
          // Path discovery
          if (d.get(w)! < 0) {
            d.set(w, d.get(v)! + 1);
            Q.push(w);
          }
          // Path counting
          if (d.get(w) === d.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            P.get(w)!.push(v);
          }
        }
      }

      const delta: Map<string, number> = new Map();
      for (const w of nodes) delta.set(w, 0);

      while (S.length > 0) {
        const w = S.pop()!;
        for (const v of P.get(w)!) {
          const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
          delta.set(v, delta.get(v)! + c);
        }
        if (w !== s) {
          CB[w] = CB[w] + delta.get(w)!;
        }
      }
    }

    // Normalize for undirected graph
    const n = nodes.length;
    const norm = n > 2 ? ((n - 1) * (n - 2)) / 2 : 1;
    const normalized: Record<string, number> = {};
    for (const v of nodes) {
      // Divide by 2 because edges are traversed in both directions in our undirected map
      normalized[v] = Number((CB[v] / (2 * norm)).toFixed(4));
    }

    return normalized;
  }
}
