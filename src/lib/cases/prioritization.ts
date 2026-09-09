import { InvestigationCase, InvestigationEntity, InvestigationRelationship } from '../types/investigation';
import { detectSuspiciousPatterns } from '../patterns/anomalyDetectors';

/**
 * Case Prioritization Engine
 * Ranks the case portfolio by a transparent, configurable weighted score:
 *
 *   score = wRisk·priorityWeight + wDensity·entityDensity + wAnomaly·anomalyLoad + wUrgency·recency
 *
 * Every factor is normalized to [0, 1] and surfaced in a human-readable breakdown so
 * supervisors can audit *why* a case ranked where it did.
 */

export interface PrioritizationWeights {
  risk: number;
  density: number;
  anomaly: number;
  urgency: number;
}

export const DEFAULT_PRIORITIZATION_WEIGHTS: PrioritizationWeights = {
  risk: 0.4,
  density: 0.2,
  anomaly: 0.25,
  urgency: 0.15,
};

const PRIORITY_WEIGHT: Record<InvestigationCase['priority'], number> = {
  critical: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.2,
};

export interface PriorityFactor {
  label: string;
  detail: string;
  value: number; // normalized 0..1
}

export interface CasePriorityScore {
  score: number; // 0..1
  factors: PriorityFactor[];
}

/** Entity count at which the density factor saturates. */
const DENSITY_SATURATION = 40;
/** Open anomaly count at which the anomaly factor saturates. */
const ANOMALY_SATURATION = 10;
/** Urgency decays to zero once the incident is older than this (days). */
const URGENCY_HALF_LIFE_DAYS = 30;
const URGENCY_CUTOFF_DAYS = 180;

export function computeCasePriority(
  caseItem: InvestigationCase,
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  weights: PrioritizationWeights = DEFAULT_PRIORITIZATION_WEIGHTS
): CasePriorityScore {
  // 1. Public risk severity (case-declared priority)
  const risk = PRIORITY_WEIGHT[caseItem.priority] ?? 0.2;

  // 2. Network entity density (solvability signal: more of the network is mapped)
  const density = Math.min(1, entities.length / DENSITY_SATURATION);

  // 3. Open anomaly load from pattern detectors
  const anomalyCount = detectSuspiciousPatterns(entities, relationships, caseItem.incidentDate).length;
  const anomaly = Math.min(1, anomalyCount / ANOMALY_SATURATION);

  // 4. Urgency — exponential decay from the incident date
  let urgency = 0;
  if (caseItem.incidentDate) {
    const days = (Date.now() - new Date(caseItem.incidentDate).getTime()) / (24 * 3600 * 1000);
    if (days >= 0 && days <= URGENCY_CUTOFF_DAYS) {
      urgency = Math.pow(0.5, days / URGENCY_HALF_LIFE_DAYS);
    }
  }

  const score = Math.min(
    1,
    weights.risk * risk + weights.density * density + weights.anomaly * anomaly + weights.urgency * urgency
  );

  return {
    score: Number(score.toFixed(3)),
    factors: [
      {
        label: 'Public Risk Severity',
        detail: `${caseItem.priority.toUpperCase()} priority declared on case`,
        value: Number(risk.toFixed(2)),
      },
      {
        label: 'Network Density',
        detail: `${entities.length} entities / ${relationships.length} links mapped`,
        value: Number(density.toFixed(2)),
      },
      {
        label: 'Anomaly Load',
        detail: `${anomalyCount} suspicious patterns currently open`,
        value: Number(anomaly.toFixed(2)),
      },
      {
        label: 'Urgency',
        detail: caseItem.incidentDate
          ? `Incident ${Math.max(
              0,
              Math.round((Date.now() - new Date(caseItem.incidentDate).getTime()) / (24 * 3600 * 1000))
            )} day(s) ago`
          : 'No incident date recorded',
        value: Number(urgency.toFixed(2)),
      },
    ],
  };
}

/**
 * Score an entire portfolio. Requires a loader for per-case graph data because
 * entities/relationships are case-scoped in storage.
 */
export function rankCases(
  cases: InvestigationCase[],
  loadData: (caseId: string) => { entities: InvestigationEntity[]; relationships: InvestigationRelationship[] },
  weights?: PrioritizationWeights
): { caseItem: InvestigationCase; priority: CasePriorityScore }[] {
  return cases
    .map((caseItem) => {
      const { entities, relationships } = loadData(caseItem.id);
      return { caseItem, priority: computeCasePriority(caseItem, entities, relationships, weights) };
    })
    .sort((a, b) => b.priority.score - a.priority.score);
}
