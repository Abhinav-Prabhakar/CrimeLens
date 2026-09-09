import { describe, it, expect } from 'vitest';
import { scoreTipCredibility } from '../../src/lib/intel/credibility';
import { InvestigationEntity } from '../../src/lib/types/investigation';

const knownEntity = (id: string, label: string, aliases: string[] = [], attributes: Record<string, any> = {}): InvestigationEntity => ({
  id,
  caseId: 'case_1',
  type: 'person',
  label,
  aliases,
  attributes,
  confidence: 0.9,
  status: 'verified_source',
  provenance: { sourceId: 's', sourceType: 'fir', sourceTitle: 'T', confidence: 0.9 },
  boardPosition: { x: 0, y: 0 },
  visualType: 'suspect',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Tip Credibility Triage', () => {
  it('scores vague anonymous tips low and caps within bounds', () => {
    const vague = scoreTipCredibility('saw something weird');
    expect(vague.score).toBeLessThan(0.5);
    expect(vague.score).toBeGreaterThanOrEqual(0);
  });

  it('rewards specific verifiable details', () => {
    const specific = scoreTipCredibility(
      'Red sedan with plate MH-01-BX-4912 parked at the Sector 14 warehouse around 22:00, driver spoke on +91 98112-44120 for several minutes before driving off slowly with lights off.',
      { locationMentioned: 'Sector 14 Warehouse', sourceCategory: 'witness_portal' }
    );
    const vague = scoreTipCredibility('saw something weird');
    expect(specific.score).toBeGreaterThan(vague.score);
    expect(specific.factors.some((f) => f.label.includes('vehicle registration'))).toBe(true);
    expect(specific.factors.some((f) => f.label.includes('contact number'))).toBe(true);
    expect(specific.score).toBeLessThanOrEqual(0.95);
  });

  it('rewards corroboration against existing case entities', () => {
    const known = [knownEntity('p1', 'Daniel Vance', ['Danny V'], { phone: '+91 98112-44120' })];
    const corroborating = scoreTipCredibility(
      'Man matching Daniel Vance was seen buying fuel canisters at the highway station.',
      { knownEntities: known }
    );
    const unrelated = scoreTipCredibility('A tall stranger was seen buying fuel canisters.', {
      knownEntities: known,
    });
    expect(corroborating.score).toBeGreaterThan(unrelated.score);
    expect(corroborating.factors.some((f) => f.label.startsWith('Corroborates'))).toBe(true);
  });

  it('never issues a verdict — always returns an inspectable factor list', () => {
    const result = scoreTipCredibility('anything', { knownEntities: [] });
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });
});
