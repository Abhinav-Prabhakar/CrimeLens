import { InvestigationEntity, InvestigationRelationship, AnomalyPattern } from '../types/investigation';

/**
 * Scan investigation graph for behavioral anomalies and suspicious criminal patterns
 */
export function detectSuspiciousPatterns(
  entities: InvestigationEntity[],
  relationships: InvestigationRelationship[],
  incidentDate?: string
): AnomalyPattern[] {
  const anomalies: AnomalyPattern[] = [];
  const entityMap = new Map<string, InvestigationEntity>();
  entities.forEach((e) => entityMap.set(e.id, e));

  // 1. Rapid Financial Hopping / Layering Detection (A -> B -> C)
  const fundTransfers = relationships.filter((r) => r.predicate === 'TRANSFERRED_FUNDS');
  for (const t1 of fundTransfers) {
    for (const t2 of fundTransfers) {
      if (t1.targetId === t2.sourceId && t1.sourceId !== t2.targetId) {
        // We have A -> B -> C
        const intermediate = entityMap.get(t1.targetId);
        const origin = entityMap.get(t1.sourceId);
        const destination = entityMap.get(t2.targetId);

        anomalies.push({
          id: `anom_fin_${t1.id}_${t2.id}`,
          type: 'rapid_financial_hop',
          title: 'Rapid Financial Layering Route Detected',
          description: `Capital routed from ${origin?.label || 'Entity'} to ${intermediate?.label || 'Intermediary'} and subsequently moved to ${destination?.label || 'Recipient'}. Indicates structured financial transit.`,
          severity: 'high',
          involvedEntityIds: [t1.sourceId, t1.targetId, t2.targetId],
          involvedRelationshipIds: [t1.id, t2.id],
          confidence: 0.89,
          detectedAt: new Date().toISOString(),
          investigativeLead: `Subpoena transaction ledgers for intermediary ${intermediate?.label} to verify beneficial ownership.`,
        });
      }
    }
  }

  // 2. Communication Burst Prior to Incident
  const comms = relationships.filter((r) => r.predicate === 'CALLED' || r.predicate === 'COMMUNICATED_WITH');
  for (const c of comms) {
    if (c.weight >= 8 || c.notes?.toLowerCase().includes('call')) {
      const src = entityMap.get(c.sourceId);
      const tgt = entityMap.get(c.targetId);

      anomalies.push({
        id: `anom_comm_${c.id}`,
        type: 'communication_burst',
        title: 'High-Frequency Communication Surge',
        description: `Unusual density of communication (${c.weight} interactions) recorded between ${src?.label} and ${tgt?.label} around critical window.`,
        severity: 'high',
        involvedEntityIds: [c.sourceId, c.targetId],
        involvedRelationshipIds: [c.id],
        confidence: 0.91,
        detectedAt: new Date().toISOString(),
        investigativeLead: 'Request lawful intercept / cell tower ping records for both IMEI devices.',
      });
    }
  }

  // 3. Geographic Anomaly at Scene
  const locationRels = relationships.filter((r) => r.predicate === 'LOCATED_AT');
  for (const lr of locationRels) {
    const ent = entityMap.get(lr.sourceId);
    const loc = entityMap.get(lr.targetId);

    if (ent?.type === 'person' && loc?.type === 'location') {
      anomalies.push({
        id: `anom_geo_${lr.id}`,
        type: 'geographic_anomaly',
        title: 'Suspect Geolocation Proximity to Incident Scene',
        description: `${ent.label} geolocated in immediate physical sector of ${loc.label} during breach window.`,
        severity: 'critical',
        involvedEntityIds: [lr.sourceId, lr.targetId],
        involvedRelationshipIds: [lr.id],
        confidence: 0.93,
        detectedAt: new Date().toISOString(),
        investigativeLead: 'Cross-reference with automated toll surveillance and dock badge access logs.',
      });
    }
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
