import { describe, it, expect } from 'vitest';
import { stringSimilarity, isAbbreviationMatch, findIdentityCandidates } from '../../src/lib/resolution/identityMatcher';
import { InvestigationEntity } from '../../src/lib/types/investigation';

const mockPerson = (
  id: string,
  label: string,
  aliases: string[] = [],
  attributes: Record<string, any> = {}
): InvestigationEntity => ({
  id,
  caseId: 'case_1',
  type: 'person',
  label,
  aliases,
  attributes,
  confidence: 0.9,
  status: 'verified_source',
  provenance: { sourceId: 'doc_1', sourceType: 'fir', sourceTitle: 'Test Doc', confidence: 0.9 },
  boardPosition: { x: 0, y: 0 },
  visualType: 'suspect',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Entity Resolution & Identity Matching', () => {
  it('should compute high string similarity for slight typographical variations', () => {
    expect(stringSimilarity('Rahul Sharma', 'Rahul Sharma')).toBe(1.0);
    expect(stringSimilarity('Daniel Vance', 'Dan Vance')).toBeGreaterThan(0.7);
    expect(stringSimilarity('Julian Marlowe', 'Elena Rostova')).toBeLessThan(0.3);
  });

  it('should detect initials and abbreviation variations', () => {
    expect(isAbbreviationMatch('R. Sharma', 'Rahul Sharma')).toBe(true);
    expect(isAbbreviationMatch('J. Marlowe', 'Julian Marlowe')).toBe(true);
    expect(isAbbreviationMatch('D. Vance', 'Elena Rostova')).toBe(false);
  });

  it('should identify candidate duplicate entities with shared phone and similar name', () => {
    const p1 = mockPerson('p1', 'Rahul Sharma', ['R. Sharma'], {
      phone: '+91 98112-44120',
      address: 'Bandra West, Mumbai',
      age: 34,
    });
    const p2 = mockPerson('p2', 'Rahul K. Sharma', [], {
      phone: '+91 98112-44120',
      address: 'Bandra, Mumbai',
      age: 35,
    });
    const p3 = mockPerson('p3', 'Alice Cooper', [], {
      phone: '+1 555-0199',
      age: 50,
    });

    const candidates = findIdentityCandidates([p1, p2, p3]);
    expect(candidates.length).toBe(1);

    const match = candidates[0];
    expect(match.similarityScore).toBeGreaterThan(0.8);
    expect(match.matchingAttributes.some((m) => m.includes('phone'))).toBe(true);
    expect(match.matchingAttributes.some((m) => m.includes('similarity'))).toBe(true);
  });

  it('should flag conflicting attributes like disparate ages', () => {
    const p1 = mockPerson('p1', 'Vikram Singh', [], {
      phone: '9876543210',
      age: 22,
    });
    const p2 = mockPerson('p2', 'Vikram Singh', [], {
      phone: '9876543210',
      age: 48, // 26 year discrepancy
    });

    const candidates = findIdentityCandidates([p1, p2]);
    expect(candidates.length).toBe(1);
    expect(candidates[0].conflictingAttributes.some((c) => c.includes('age discrepancy'))).toBe(true);
  });
});
