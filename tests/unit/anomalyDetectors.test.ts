import { describe, it, expect } from 'vitest';
import { detectSuspiciousPatterns } from '../../src/lib/patterns/anomalyDetectors';
import { SEED_ENTITIES, SEED_RELATIONSHIPS } from '../../src/lib/storage/seedData';

describe('Suspicious Pattern & Anomaly Detection', () => {
  it('should detect rapid financial hopping (Shell Co -> Wire -> Elena)', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS);
    const finHop = patterns.find((p) => p.type === 'rapid_financial_hop');

    expect(finHop).toBeDefined();
    expect(finHop?.severity).toBe('high');
    expect(finHop?.description).toContain('Capital routed from');
  });

  it('should detect high-frequency communication bursts', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS);
    const commBurst = patterns.find((p) => p.type === 'communication_burst');

    expect(commBurst).toBeDefined();
    expect(commBurst?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should detect geographic anomalies near crime scene', () => {
    const patterns = detectSuspiciousPatterns(SEED_ENTITIES, SEED_RELATIONSHIPS);
    const geoAnom = patterns.find((p) => p.type === 'geographic_anomaly');

    expect(geoAnom).toBeDefined();
    expect(geoAnom?.severity).toBe('critical');
    expect(geoAnom?.involvedEntityIds).toContain('ent_vance');
    expect(geoAnom?.involvedEntityIds).toContain('ent_scene');
  });
});
