import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';

/**
 * Seed the demo Blackwood Syndicate case.
 * Default: only when the graph database is empty. `force: true` re-seeds over
 * an existing database (used by the explicit reset-to-seed action).
 */
export async function POST(req: NextRequest) {
  try {
    let force = false;
    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch {
      /* empty body is valid */
    }
    const result = await seedDatabase(force);
    return NextResponse.json(result);
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
