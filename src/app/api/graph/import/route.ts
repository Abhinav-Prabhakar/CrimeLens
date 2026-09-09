import { NextRequest, NextResponse } from 'next/server';
import { importBundle } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';
import { BundleValidationError } from '@/lib/storage/importExport';

/**
 * Import a .crimelens.json case bundle into the Neo4j graph database.
 * Structural + referential validation and collision re-scoping execute
 * server-side; the client receives the resolved case identity.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const result = await importBundle(raw);
    return NextResponse.json({
      ok: true,
      caseId: result.bundle.caseItem.id,
      message: result.message,
      renamed: result.renamed,
    });
  } catch (err) {
    if (err instanceof BundleValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
