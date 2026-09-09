import { NextResponse } from 'next/server';
import { GraphDatabaseError } from '@/lib/graph/neo4j';

/** Shared error envelope for all /api/graph routes (zero-fallback: explicit, actionable errors). */
export function graphErrorResponse(err: unknown): NextResponse {
  if (err instanceof GraphDatabaseError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Unknown graph database error';
  console.error('Graph API error:', err);
  return NextResponse.json({ error: `Graph database operation failed: ${message}` }, { status: 500 });
}
