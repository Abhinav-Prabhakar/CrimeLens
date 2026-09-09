export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'vehicle'
  | 'phone'
  | 'account'
  | 'document'
  | 'event'
  | 'evidence_item';

export type BoardCardType =
  | 'photo'
  | 'suspect'
  | 'sticky'
  | 'doc'
  | 'news'
  | 'print'
  | 'map'
  | 'statement'
  | 'bag'
  | 'key'
  | 'plan';

export type VerificationStatus =
  | 'verified_source'
  | 'ai_inferred'
  | 'investigator_confirmed'
  | 'unverified'
  | 'predicted';

export type RelationPredicate =
  | 'KNOWS'
  | 'CALLED'
  | 'TRANSFERRED_FUNDS'
  | 'OWNS'
  | 'WORKS_FOR'
  | 'LOCATED_AT'
  | 'TRAVELED_TO'
  | 'ASSOCIATED_WITH'
  | 'MENTIONED_IN'
  | 'PARTICIPATED_IN'
  | 'SUSPECTED_IN'
  | 'COMMUNICATED_WITH'
  | 'OWNS_DEVICE'
  | 'OPERATES_AT';

export interface SourceProvenance {
  sourceId: string;
  sourceType: 'fir' | 'cdr' | 'bank_record' | 'transcript' | 'surveillance' | 'public_intel' | 'forensic';
  sourceTitle: string;
  excerpt?: string;
  timestamp?: string;
  confidence: number;
}

export interface InvestigationEntity {
  id: string;
  caseId: string;
  type: EntityType;
  label: string;
  aliases: string[];
  attributes: Record<string, any>;
  confidence: number; // 0.0 - 1.0
  status: VerificationStatus;
  provenance: SourceProvenance;
  boardPosition: {
    x: number;
    y: number;
    z?: number;
    rotation?: number;
  };
  visualType: BoardCardType;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationRelationship {
  id: string;
  caseId: string;
  sourceId: string;
  targetId: string;
  predicate: RelationPredicate;
  label?: string;
  weight: number;
  confidence: number; // 0.0 - 1.0
  status: VerificationStatus;
  threadColor: 'crimson' | 'twine' | 'cobalt' | 'shadow';
  validFrom?: string;
  validTo?: string;
  provenance: SourceProvenance;
  notes?: string;
  manuallyConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationCase {
  id: string;
  title: string;
  caseNumber: string;
  description: string;
  status: 'active' | 'archived' | 'cold' | 'solved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  leadInvestigator: string;
  jurisdiction: string;
  incidentDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface IngestedDocument {
  id: string;
  caseId: string;
  title: string;
  documentType: 'fir' | 'interrogation' | 'cdr' | 'financial' | 'surveillance' | 'public_intel';
  rawText: string;
  summary?: string;
  extractionStatus: 'pending' | 'extracted' | 'confirmed' | 'failed';
  extractedEntitiesCount?: number;
  extractedRelationshipsCount?: number;
  importedAt: string;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  action:
    | 'case_created'
    | 'case_updated'
    | 'case_deleted'
    | 'entity_created'
    | 'entity_updated'
    | 'entity_deleted'
    | 'entities_merged'
    | 'relationship_created'
    | 'relationship_confirmed'
    | 'relationship_deleted'
    | 'document_ingested'
    | 'ai_extraction_approved'
    | 'report_generated'
    | 'link_prediction_confirmed'
    | 'bundle_exported'
    | 'bundle_imported'
    | 'intel_triaged'
    | 'intel_promoted'
    | 'sos_dispatched';
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
  investigator: string;
}

/**
 * A chronologically placed investigative event.
 * Derived automatically from relationships, documents and the case incident anchor,
 * or pinned manually / committed from AI extraction (human-in-the-loop approved).
 */
export interface InvestigationTimelineEvent {
  id: string;
  caseId: string;
  timestamp: string; // ISO — when the event occurred (best known)
  title: string;
  category: 'incident' | 'communication' | 'financial' | 'forensic' | 'surveillance' | 'document';
  description: string;
  involvedEntityIds: string[];
  source:
    | 'incident_anchor'
    | 'relationship'
    | 'ai_extraction'
    | 'manual'
    | 'document';
  sourceRefId?: string; // relationship id / document id / audit id
  createdAt: string;
}

/** Trusted well-wisher contact for the women safety escalation network (user-scoped, not case-scoped). */
export interface SafetyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  createdAt: string;
}

export interface IdentityMatchCandidate {
  id: string;
  entityA: InvestigationEntity;
  entityB: InvestigationEntity;
  similarityScore: number;
  matchingAttributes: string[];
  conflictingAttributes: string[];
  reason: string;
  status: 'pending' | 'merged' | 'rejected' | 'alias';
}

export interface AnomalyPattern {
  id: string;
  type: 'rapid_financial_hop' | 'communication_burst' | 'geographic_anomaly' | 'new_intermediary' | 'shell_structure';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  involvedEntityIds: string[];
  involvedRelationshipIds: string[];
  confidence: number;
  detectedAt: string;
  investigativeLead: string;
}

export interface PublicIntelSubmission {
  id: string;
  caseId?: string;
  submittedAt: string;
  sourceCategory: 'anonymous_tip' | 'witness_portal' | 'hotline';
  content: string;
  locationMentioned?: string;
  credibilityScore: number; // 0.0 - 1.0
  status: 'pending_review' | 'verified_lead' | 'dismissed_spam';
  investigatorNotes?: string;
}
