import { openDB, IDBPDatabase } from 'idb';
import {
  InvestigationCase,
  InvestigationEntity,
  InvestigationRelationship,
  IngestedDocument,
  AuditLogEntry,
  PublicIntelSubmission,
} from '../types/investigation';

const DB_NAME = 'crimelens_investigation_db';
const DB_VERSION = 1;

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

  return {
    version: '1.0.0',
    system: 'CrimeLens',
    exportedAt: new Date().toISOString(),
    caseItem,
    entities,
    relationships,
    documents,
    auditLogs,
  };
}
