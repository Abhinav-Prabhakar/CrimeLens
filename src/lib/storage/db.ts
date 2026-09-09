import { openDB, IDBPDatabase } from 'idb';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  AuditLogEntry,
  PublicIntelSubmission,
  InvestigationTimelineEvent,
  SafetyContact,
} from '../types/investigation';

const DB_NAME = 'crimelens_investigation_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    // Return a dummy object if running in SSR
    return Promise.reject(new Error('IndexedDB is only accessible in browser runtime'));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cases
        if (!db.objectStoreNames.contains('cases')) {
          db.createObjectStore('cases', { keyPath: 'id' });
        }
        // Entities (Nodes & Cards)
        if (!db.objectStoreNames.contains('entities')) {
          const entityStore = db.createObjectStore('entities', { keyPath: 'id' });
          entityStore.createIndex('caseId', 'caseId', { unique: false });
          entityStore.createIndex('type', 'type', { unique: false });
        }
        // Relationships (Edges & Threads)
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('caseId', 'caseId', { unique: false });
          relStore.createIndex('sourceId', 'sourceId', { unique: false });
          relStore.createIndex('targetId', 'targetId', { unique: false });
        }
        // Documents
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('caseId', 'caseId', { unique: false });
        }
        // Audit Logs
        if (!db.objectStoreNames.contains('audit_logs')) {
          const logStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          logStore.createIndex('caseId', 'caseId', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        // Public Intel Submissions
        if (!db.objectStoreNames.contains('intel_submissions')) {
          const intelStore = db.createObjectStore('intel_submissions', { keyPath: 'id' });
          intelStore.createIndex('submittedAt', 'submittedAt', { unique: false });
        }
        // Timeline Events (v2): committed AI extractions + manual pins + derived chronology sources
        if (!db.objectStoreNames.contains('timeline_events')) {
          const tlStore = db.createObjectStore('timeline_events', { keyPath: 'id' });
          tlStore.createIndex('caseId', 'caseId', { unique: false });
        }
        // Women Safety trusted contacts (v2): user-scoped, not case-scoped
        if (!db.objectStoreNames.contains('safety_contacts')) {
          db.createObjectStore('safety_contacts', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ----------------- CRUD API -----------------

export async function getAllCases(): Promise<InvestigationCase[]> {
  const db = await getDB();
  return db.getAll('cases');
}

export async function getCaseById(id: string): Promise<InvestigationCase | undefined> {
  const db = await getDB();
  return db.get('cases', id);
}

export async function saveCase(caseItem: InvestigationCase): Promise<void> {
  const db = await getDB();
  await db.put('cases', caseItem);
}

export async function getEntitiesByCase(caseId: string): Promise<InvestigationEntity[]> {
  const db = await getDB();
  return db.getAllFromIndex('entities', 'caseId', caseId);
}

export async function saveEntity(entity: InvestigationEntity): Promise<void> {
  const db = await getDB();
  await db.put('entities', entity);
}

export async function deleteEntity(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('entities', id);
  // Also delete associated relationships
  const tx = db.transaction('relationships', 'readwrite');
  const rels = await tx.store.getAll();
  for (const rel of rels) {
    if (rel.sourceId === id || rel.targetId === id) {
      await tx.store.delete(rel.id);
    }
  }
  await tx.done;
}

export async function getRelationshipsByCase(caseId: string): Promise<InvestigationRelationship[]> {
  const db = await getDB();
  return db.getAllFromIndex('relationships', 'caseId', caseId);
}

export async function saveRelationship(rel: InvestigationRelationship): Promise<void> {
  const db = await getDB();
  await db.put('relationships', rel);
}

export async function deleteRelationship(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('relationships', id);
}

export async function getDocumentsByCase(caseId: string): Promise<IngestedDocument[]> {
  const db = await getDB();
  return db.getAllFromIndex('documents', 'caseId', caseId);
}

export async function saveDocument(doc: IngestedDocument): Promise<void> {
  const db = await getDB();
  await db.put('documents', doc);
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const db = await getDB();
  await db.put('audit_logs', entry);
}

export async function getAuditLogs(caseId: string): Promise<AuditLogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('audit_logs', 'caseId', caseId);
}

export async function getAllIntelSubmissions(): Promise<PublicIntelSubmission[]> {
  const db = await getDB();
  return db.getAll('intel_submissions');
}

export async function saveIntelSubmission(sub: PublicIntelSubmission): Promise<void> {
  const db = await getDB();
  await db.put('intel_submissions', sub);
}

export async function deleteIntelSubmission(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('intel_submissions', id);
}

// ----------------- Timeline Events -----------------

export async function getTimelineEventsByCase(caseId: string): Promise<InvestigationTimelineEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('timeline_events', 'caseId', caseId);
}

export async function saveTimelineEvent(ev: InvestigationTimelineEvent): Promise<void> {
  const db = await getDB();
  await db.put('timeline_events', ev);
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('timeline_events', id);
}

// ----------------- Safety Contacts -----------------

export async function getAllSafetyContacts(): Promise<SafetyContact[]> {
  const db = await getDB();
  return db.getAll('safety_contacts');
}

export async function saveSafetyContact(contact: SafetyContact): Promise<void> {
  const db = await getDB();
  await db.put('safety_contacts', contact);
}

export async function deleteSafetyContact(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('safety_contacts', id);
}

// ----------------- Case-level deletion -----------------

/** Removes a case and every record scoped to it (entities, rels, docs, logs, timeline). */
export async function purgeCaseData(caseId: string): Promise<void> {
  const db = await getDB();
  const stores = ['entities', 'relationships', 'documents', 'audit_logs', 'timeline_events'] as const;
  for (const store of stores) {
    const keys = await db.getAllKeysFromIndex(store, 'caseId', caseId);
    const tx = db.transaction(store, 'readwrite');
    for (const key of keys) await tx.store.delete(key);
    await tx.done;
  }
  await db.delete('cases', caseId);
}

/**
 * Export full case bundle to JSON
 */
export async function exportCaseData(caseId: string) {
  const db = await getDB();
  const caseItem = await db.get('cases', caseId);
  const entities = await db.getAllFromIndex('entities', 'caseId', caseId);
  const relationships = await db.getAllFromIndex('relationships', 'caseId', caseId);
  const documents = await db.getAllFromIndex('documents', 'caseId', caseId);
  const auditLogs = await db.getAllFromIndex('audit_logs', 'caseId', caseId);
  const timelineEvents = await db.getAllFromIndex('timeline_events', 'caseId', caseId);
  const intelSubmissions = (await db.getAll('intel_submissions')).filter(
    (s) => s.caseId === caseId
  );

  return {
    version: '1.1.0',
    system: 'CrimeLens',
    exportedAt: new Date().toISOString(),
    caseItem,
    entities,
    relationships,
    documents,
    auditLogs,
    timelineEvents,
    intelSubmissions,
  };
}
