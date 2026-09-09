import { NextResponse } from 'next/server';
import { getNeo4jDriver, graphStatus } from '@/lib/graph/neo4j';

export async function GET() {
  if (!getNeo4jDriver()) {
    return NextResponse.json(
      {
        online: false,
        error:
          'Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD in the server environment (.env.local).',
      },
      { status: 503 }
    );
  }
  try {
    const status = await graphStatus();
    return NextResponse.json({ ...status, configured: true });
  } catch (err: any) {
    return NextResponse.json(
      {
        online: false,
        error: `Neo4j unreachable: ${err?.message || 'connection failed'}. Is the database running?`,
      },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';
