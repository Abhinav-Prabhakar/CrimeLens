import { NextRequest, NextResponse } from 'next/server';
import { getCaseState } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';

export async function GET(req: NextRequest) {
  try {
    const caseId = req.nextUrl.searchParams.get('caseId');
    if (!caseId) {
      return NextResponse.json({ error: 'caseId query parameter is required.' }, { status: 400 });
    }
    const state = await getCaseState(caseId);
    if (!state.caseItem) {
      return NextResponse.json({ error: `Case ${caseId} not found in the graph database.` }, { status: 404 });
    }
    return NextResponse.json(state);
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
