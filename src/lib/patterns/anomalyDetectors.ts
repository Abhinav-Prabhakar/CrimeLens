import { InvestigationEntity, InvestigationRelationship, AnomalyPattern } from '../types/investigation';

/**
 * Scan investigation graph for behavioral anomalies and suspicious criminal patterns.
 *
 * Temporal semantics: when the case supplies an incident date, detectors only flag
 * records whose evidential time window overlaps the relevant investigation window
 * (±72h pre-incident for communication bursts, ±24h for scene proximity). Records
 * with no temporal data are still flagged, but at reduced severity with an explicit
 * caveat — never silently asserted as "during the breach window".
 */

type TemporalOverlap = 'yes' | 'no' | 'unknown';

function relationshipWindow(rel: InvestigationRelationship): { start: number | null; end: number | null } {
  const start = rel.validFrom ? new Date(rel.validFrom).getTime() : null;
  const end = rel.validTo ? new Date(rel.validTo).getTime() : null;
  return { start: Number.isNaN(start!) ? null : start, end: Number.isNaN(end!) ? null : end };
}

function overlapsWindow(rel: InvestigationRelationship, winStart: number, winEnd: number): TemporalOverlap {
  const { start, end } = relationshipWindow(rel);
  if (start === null && end === null) {
    const provenanceTs = rel.provenance?.timestamp ? new Date(rel.provenance.timestamp).getTime() : null;
    if (provenanceTs === null || Number.isNaN(provenanceTs)) return 'unknown';
    return provenanceTs >= winStart && provenanceTs <= winEnd ? 'yes' : 'no';
  }
  // Interval [start, end] (open-ended ends treated as point-in-time at start)
  const s = start ?? end!;
  const e = end ?? start!;
  return s <= winEnd && e >= winStart ? 'yes' : 'no';
}

export function detectSuspiciousPatterns(
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  incidentDate?: string
): AnomalyPattern[] {
  const anomalies: AnomalyPattern[] = [];
  const entityMap = new Map<string, InvestigationEntity>();
  entities.forEach((e) => entityMap.set(e.id, e));

  const incidentMs = incidentDate ? new Date(incidentDate).getTime() : null;
  const hasIncidentAnchor = incidentMs !== null && !Number.isNaN(incidentMs);
  const HOUR = 3600 * 1000;

  // 1. Rapid Financial Hopping / Layering Detection (A -> B -> C)
  const fundTransfers = relationships.filter((r) => r.predicate === 'TRANSFERRED_FUNDS');
  const seenHopPairs = new Set<string>();
  for (const t1 of fundTransfers) {
    for (const t2 of fundTransfers) {
      if (t1.targetId === t2.sourceId && t1.sourceId !== t2.targetId) {
        // Dedupe mirrored reports of the same A→B→C route
        const pairKey = [t1.id, t2.id].sort().join('|');
        if (seenHopPairs.has(pairKey)) continue;
        seenHopPairs.add(pairKey);

        // We have A -> B -> C
        const intermediate = entityMap.get(t1.targetId);
        const origin = entityMap.get(t1.sourceId);
        const destination = entityMap.get(t2.targetId);

        // Temporal proximity between the two legs, when known
        const ts1 = t1.validFrom || t1.provenance?.timestamp;
        const ts2 = t2.validFrom || t2.provenance?.timestamp;
        let severity: AnomalyPattern['severity'] = 'high';
        let tempoNote = 'Timing of legs not individually timestamped.';
        if (ts1 && ts2) {
          const gapHrs = Math.abs(new Date(ts2).getTime() - new Date(ts1).getTime()) / HOUR;
          if (Number.isFinite(gapHrs) && gapHrs <= 72) {
            tempoNote = `Legs executed ${gapHrs < 1 ? 'under an hour' : `${gapHrs.toFixed(0)} hours`} apart — consistent with rapid layering.`;
          } else if (Number.isFinite(gapHrs)) {
            severity = 'medium';
            tempoNote = `Legs separated by ~${(gapHrs / 24).toFixed(0)} days — layered, but not rapid.`;
          }
        }

        anomalies.push({
          id: `anom_fin_${t1.id}_${t2.id}`,
          type: 'rapid_financial_hop',
          title: 'Rapid Financial Layering Route Detected',
          description: `Capital routed from ${origin?.label || 'Entity'} to ${
            intermediate?.label || 'Intermediary'
          } and subsequently moved to ${destination?.label || 'Recipient'}. ${tempoNote}`,
          severity,
          involvedEntityIds: [t1.sourceId, t1.targetId, t2.targetId],
          involvedRelationshipIds: [t1.id, t2.id],
          confidence: 0.89,
          detectedAt: new Date().toISOString(),
          investigativeLead: `Subpoena transaction ledgers for intermediary ${intermediate?.label} to verify beneficial ownership.`,
        });
      }
    }
  }

  // 2. Communication Burst in the pre-incident window
  const burstWindowStart = hasIncidentAnchor ? incidentMs! - 72 * HOUR : null;
  const burstWindowEnd = hasIncidentAnchor ? incidentMs! + 24 * HOUR : null;
  const comms = relationships.filter((r) => r.predicate === 'CALLED' || r.predicate === 'COMMUNICATED_WITH');
  for (const c of comms) {
    if (c.weight < 8) continue;

    const src = entityMap.get(c.sourceId);
    const tgt = entityMap.get(c.targetId);

    let severity: AnomalyPattern['severity'] = 'high';
    let tempoNote = '';
    let confidence = 0.91;
    if (!hasIncidentAnchor) {
      severity = 'medium';
      tempoNote = 'No incident anchor recorded on the case — burst timing cannot be correlated.';
    } else {
      const overlap = overlapsWindow(c, burstWindowStart!, burstWindowEnd!);
      if (overlap === 'no') continue; // burst happened far from the incident: not anomalous
      if (overlap === 'unknown') {
        severity = 'medium';
        confidence = 0.8;
        tempoNote = 'Temporal data unavailable — cannot confirm the burst fell inside the pre-incident window.';
      } else {
        tempoNote = 'Burst overlaps the 72-hour pre-incident window.';
      }
    }

    anomalies.push({
      id: `anom_comm_${c.id}`,
      type: 'communication_burst',
      title: 'High-Frequency Communication Surge',
      description: `Unusual density of communication (${c.weight} interactions) recorded between ${
        src?.label
      } and ${tgt?.label}. ${tempoNote}`,
      severity,
      involvedEntityIds: [c.sourceId, c.targetId],
      involvedRelationshipIds: [c.id],
      confidence,
      detectedAt: new Date().toISOString(),
      investigativeLead: 'Request lawful intercept / cell tower ping records for both IMEI devices.',
    });
  }

  // 3. Geographic Anomaly at Scene (incident ±24h)
  const geoWindowStart = hasIncidentAnchor ? incidentMs! - 24 * HOUR : null;
  const geoWindowEnd = hasIncidentAnchor ? incidentMs! + 24 * HOUR : null;
  const locationRels = relationships.filter((r) => r.predicate === 'LOCATED_AT');
  for (const lr of locationRels) {
    const ent = entityMap.get(lr.sourceId);
    const loc = entityMap.get(lr.targetId);

    if (ent?.type !== 'person' || loc?.type !== 'location') continue;

    let severity: AnomalyPattern['severity'] = 'critical';
    let tempoNote = 'Presence geolocated inside the incident window.';
    if (!hasIncidentAnchor) {
      severity = 'medium';
      tempoNote = 'No incident anchor recorded — presence cannot be correlated to the breach window.';
    } else {
      const overlap = overlapsWindow(lr, geoWindowStart!, geoWindowEnd!);
      if (overlap === 'no') continue;
      if (overlap === 'unknown') {
        severity = 'medium';
        tempoNote = 'Temporal data unavailable — cannot confirm presence during the breach window.';
      }
    }

    anomalies.push({
      id: `anom_geo_${lr.id}`,
      type: 'geographic_anomaly',
      title: 'Suspect Geolocation Proximity to Incident Scene',
      description: `${ent.label} geolocated in immediate physical sector of ${loc.label}. ${tempoNote}`,
      severity,
      involvedEntityIds: [lr.sourceId, lr.targetId],
      involvedRelationshipIds: [lr.id],
      confidence: 0.93,
      detectedAt: new Date().toISOString(),
      investigativeLead: 'Cross-reference with automated toll surveillance and dock badge access logs.',
    });
  }

  // 4. Shell Company Structure
  const shellEntities = entities.filter(
    (e) =>
      e.type === 'organization' &&
      (e.tags.includes('shell_company') ||
        e.notes?.toLowerCase().includes('paper corporation') ||
        e.notes?.toLowerCase().includes('offshore'))
  );

  for (const shell of shellEntities) {
    anomalies.push({
      id: `anom_shell_${shell.id}`,
      type: 'shell_structure',
      title: 'Offshore Nominee Shell Vehicle Identified',
      description: `Entity ${shell.label} matches indicators of non-operational offshore shell entity used to mask real beneficiaries.`,
      severity: 'medium',
      involvedEntityIds: [shell.id],
      involvedRelationshipIds: [],
      confidence: 0.88,
      detectedAt: new Date().toISOString(),
      investigativeLead: 'Initiate Mutual Legal Assistance Treaty (MLAT) request for beneficial ownership registry.',
    });
  }

  return anomalies;
}
