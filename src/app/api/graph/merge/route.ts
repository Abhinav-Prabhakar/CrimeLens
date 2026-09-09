import { NextRequest, NextResponse } from 'next/server';
import { mergeEntities } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';

export async function POST(req: NextRequest) {
  try {
    const { keptId, mergedId } = (await req.json()) as { keptId: string; mergedId: string };
    if (!keptId || !mergedId) {
      return NextResponse.json({ error: 'keptId and mergedId are required.' }, { status: 400 });
    }
    if (keptId === mergedId) {
      return NextResponse.json({ error: 'Cannot merge an entity into itself.' }, { status: 400 });
    }
    const result = await mergeEntities(keptId, mergedId);
    return NextResponse.json(result);
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
