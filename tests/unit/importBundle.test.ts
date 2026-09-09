import { describe, it, expect } from 'vitest';
import { validateBundle, planImport, BundleValidationError, CaseBundle } from '../../src/lib/storage/importExport';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../../src/lib/storage/seedData';

describe('Case Bundle Import', () => {
  const validBundle = (overrides: Partial<CaseBundle> = {}): CaseBundle => ({
    version: '1.1.0',
    system: 'CrimeLens',
    exportedAt: new Date().toISOString(),
    caseItem: SEED_CASE,
    entities: SEED_ENTITIES,
    relationships: SEED_RELATIONSHIPS,
    documents: [],
    auditLogs: [],
    timelineEvents: [],
    intelSubmissions: [],
    ...overrides,
  });

  it('accepts a structurally valid bundle and preserves all scoped records', () => {
    const bundle = validateBundle(validBundle());
    expect(bundle.caseItem.id).toBe(SEED_CASE.id);
    expect(bundle.entities).toHaveLength(SEED_ENTITIES.length);
    expect(bundle.relationships).toHaveLength(SEED_RELATIONSHIPS.length);
  });

  it('rejects non-CrimeLens payloads with actionable errors', () => {
    expect(() => validateBundle(null)).toThrow(BundleValidationError);
    expect(() => validateBundle({ foo: 1 })).toThrow(/not a CrimeLens case bundle/);
    expect(() => validateBundle({ system: 'CrimeLens' })).toThrow(/no valid case record/);
  });

  it('rejects bundles with relationships referencing missing entities', () => {
    const dangling = validBundle({
      relationships: [
        ...SEED_RELATIONSHIPS,
        {
          ...SEED_RELATIONSHIPS[0],
          id: 'rel_dangling',
          targetId: 'ent_does_not_exist',
        },
      ],
    });
    expect(() => validateBundle(dangling)).toThrow(/referenc.*missing entit|integrity failure/i);
  });

  it('imports unchanged when the case id is new locally', () => {
    const plan = planImport(validBundle(), new Set(['case_other']));
    expect(plan.renamed).toBe(false);
    expect(plan.bundle.caseItem.id).toBe(SEED_CASE.id);
  });

  it('re-scopes every record when the case id already exists locally (never overwrites)', () => {
    const plan = planImport(validBundle(), new Set([SEED_CASE.id]));
    expect(plan.renamed).toBe(true);
    expect(plan.originalCaseId).toBe(SEED_CASE.id);
    expect(plan.bundle.caseItem.id).not.toBe(SEED_CASE.id);
    expect(plan.bundle.caseItem.id).toContain('_imported_');
    expect(plan.bundle.caseItem.title).toContain('imported');
    // Every case-scoped record follows the new identity
    expect(plan.bundle.entities.every((e) => e.caseId === plan.bundle.caseItem.id)).toBe(true);
    expect(plan.bundle.relationships.every((r) => r.caseId === plan.bundle.caseItem.id)).toBe(true);
    // Relationship endpoints still resolve inside the re-scoped entity set
    const ids = new Set(plan.bundle.entities.map((e) => e.id));
    expect(plan.bundle.relationships.every((r) => ids.has(r.sourceId) && ids.has(r.targetId))).toBe(true);
  });
});
