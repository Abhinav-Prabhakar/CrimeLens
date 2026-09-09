import { describe, it, expect } from 'vitest';
import { detectSuspiciousPatterns } from '../../src/lib/patterns/anomalyDetectors';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../../src/lib/storage/seedData';

describe('Suspicious Pattern & Anomaly Detection', () => {
  it('should detect rapid financial hopping (Shell Co -> Wire -> Elena)', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS, SEED_CASE.incidentDate);
    const finHop = patterns.find((p) => p.type === 'rapid_financial_hop');

    expect(finHop).toBeDefined();
    expect(finHop?.severity).toBe('high');
    expect(finHop?.description).toContain('Capital routed from');
  });

  it('should detect high-frequency communication bursts', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS, SEED_CASE.incidentDate);
    const commBurst = patterns.find((p) => p.type === 'communication_burst');

    expect(commBurst).toBeDefined();
    expect(commBurst?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should detect geographic anomalies near crime scene', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS, SEED_CASE.incidentDate);
    const geoAnom = patterns.find((p) => p.type === 'geographic_anomaly');

    expect(geoAnom).toBeDefined();
    expect(geoAnom?.severity).toBe('critical');
    expect(geoAnom?.involvedEntityIds).toContain('ent_vance');
    expect(geoAnom?.involvedEntityIds).toContain('ent_scene');
  });

  it('should downgrade temporally unverifiable anomalies when no incident anchor exists', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS);
    const geoAnom = patterns.find((p) => p.type === 'geographic_anomaly');

    expect(geoAnom).toBeDefined();
    expect(geoAnom?.severity).toBe('medium');
    expect(geoAnom?.description).toContain('No incident anchor');
  });

  it('should not flag communication bursts outside the pre-incident window', () => {
    const oldBurst = SEED_RELATIONSHIPS.map((r) =>
      r.id === 'rel_1' ? { ...r, validFrom: '2026-01-01T00:00:00Z', validTo: '2026-01-02T00:00:00Z' } : r
    );
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, oldBurst, SEED_CASE.incidentDate);
    const flaggedRel1 = patterns.find((p) => p.type === 'communication_burst' && p.involvedRelationshipIds.includes('rel_1'));

    // rel_1 moved far from the incident: it must not be asserted as a pre-incident burst
    expect(flaggedRel1).toBeUndefined();
  });
});
