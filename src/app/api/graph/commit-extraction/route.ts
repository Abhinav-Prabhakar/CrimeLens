import { NextRequest, NextResponse } from 'next/server';
import { commitExtraction } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';

/**
 * Commit human-in-the-loop approved AI extraction into the Neo4j knowledge graph.
 * Duplicate resolution (alias + fuzzy), collision-free placement and document
 * provenance records all execute server-side in the graph database.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      caseId,
      entities,
      relationships,
      timelineEvents,
      docMeta,
    } = body as {
      caseId: string;
      entities: any[];
      relationships: any[];
      timelineEvents: any[];
      docMeta: { title: string; documentType: string; rawText: string; summary?: string };
    };

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
    }
    if (!docMeta || !docMeta.title) {
      return NextResponse.json({ error: 'docMeta.title is required.' }, { status: 400 });
    }

    const result = await commitExtraction(
      caseId,
      Array.isArray(entities) ? entities : [],
      Array.isArray(relationships) ? relationships : [],
      Array.isArray(timelineEvents) ? timelineEvents : [],
      {
        title: docMeta.title,
        documentType: docMeta.documentType || 'fir',
        rawText: docMeta.rawText || '',
        summary: docMeta.summary,
      }
    );
    return NextResponse.json(result);
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
