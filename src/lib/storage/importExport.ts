import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  AuditLogEntry,
  InvestigationTimelineEvent,
  PublicIntelSubmission,
} from '../types/investigation';

/**
 * Case Bundle Import
 * Validates a `.crimelens.json` export and plans the import: structural validation,
 * collision detection, and deterministic re-identification when the case already
 * exists locally (imports never silently overwrite live investigations).
 */

export interface CaseBundle {
  version: string;
  system: string;
  exportedAt: string;
  caseItem: InvestigationCase;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  documents: IngestedDocument[];
  auditLogs: AuditLogEntry[];
  timelineEvents: InvestigationTimelineEvent[];
  intelSubmissions: PublicIntelSubmission[];
}

export interface ImportPlan {
  bundle: CaseBundle;
  renamed: boolean;
  originalCaseId: string;
}

export class BundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleValidationError';
  }
}

const isRecord = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate an unknown parsed JSON payload as a CrimeLens case bundle.
 * Throws BundleValidationError with an actionable message on any structural problem.
 */
export function validateBundle(raw: unknown): CaseBundle {
  if (!isRecord(raw)) {
    throw new BundleValidationError('Bundle is not a JSON object.');
  }
  if (raw.system !== 'CrimeLens') {
    throw new BundleValidationError('File is not a CrimeLens case bundle (missing system marker).');
  }
  if (!isRecord(raw.caseItem) || typeof raw.caseItem.id !== 'string' || typeof raw.caseItem.title !== 'string') {
    throw new BundleValidationError('Bundle has no valid case record (caseItem.id / caseItem.title missing).');
  }
  const caseItem = raw.caseItem as unknown as InvestigationCase;
  const arrOrEmpty = (v: unknown): any[] => (Array.isArray(v) ? v : []);

  const entities = arrOrEmpty(raw.entities).filter((e) => isRecord(e) && typeof e.id === 'string');
  const relationships = arrOrEmpty(raw.relationships).filter((e) => isRecord(e) && typeof e.id === 'string');
  const documents = arrOrEmpty(raw.documents).filter((e) => isRecord(e) && typeof e.id === 'string');
  const auditLogs = arrOrEmpty(raw.auditLogs).filter((e) => isRecord(e) && typeof e.id === 'string');
  const timelineEvents = arrOrEmpty(raw.timelineEvents).filter((e) => isRecord(e) && typeof e.id === 'string');
  const intelSubmissions = arrOrEmpty(raw.intelSubmissions).filter((e) => isRecord(e) && typeof e.id === 'string');

  // Referential integrity: every relationship endpoint must exist in the entity set
  const ids = new Set(entities.map((e) => e.id));
  const dangling = relationships.filter((r) => !ids.has(r.sourceId) || !ids.has(r.targetId));
  if (dangling.length > 0) {
    throw new BundleValidationError(
      `Bundle integrity failure: ${dangling.length} relationship(s) reference missing entities (first: ${
        dangling[0].id
      }).`
    );
  }

  return {
    version: String(raw.version || '1.0.0'),
    system: 'CrimeLens',
    exportedAt: String(raw.exportedAt || new Date().toISOString()),
    caseItem,
    entities,
    relationships,
    documents,
    auditLogs,
    timelineEvents,
    intelSubmissions,
  };
}

/**
 * Plan an import against the set of locally existing case IDs.
 * If the bundle's case id already exists locally, every record is re-scoped to a
 * fresh `<id>_imported_<ts>` case identity so the live case is never overwritten.
 */
export function planImport(bundle: CaseBundle, existingCaseIds: Set<string>): ImportPlan {
  const renamed = existingCaseIds.has(bundle.caseItem.id);
  if (!renamed) return { bundle, renamed: false, originalCaseId: bundle.caseItem.id };

  const newCaseId = `${bundle.caseItem.id}_imported_${Date.now()}`;
  const suffix = ` (imported ${new Date().toLocaleDateString()})`;
  // Case-scoped records carry a caseId field; the case record itself is re-identified
  const rescope = <T extends { caseId?: string }>(rec: T): T =>
    rec.caseId !== undefined ? { ...rec, caseId: newCaseId } : rec;

  return {
    bundle: {
      ...bundle,
      caseItem: {
        ...bundle.caseItem,
        id: newCaseId,
        title: bundle.caseItem.title + suffix,
        caseNumber: `${bundle.caseItem.caseNumber}-IMP`,
      },
      entities: bundle.entities.map(rescope),
      relationships: bundle.relationships.map(rescope),
      documents: bundle.documents.map(rescope),
      auditLogs: bundle.auditLogs.map(rescope),
      timelineEvents: bundle.timelineEvents.map(rescope),
      intelSubmissions: bundle.intelSubmissions.map(rescope),
    },
    renamed: true,
    originalCaseId: bundle.caseItem.id,
  };
}
