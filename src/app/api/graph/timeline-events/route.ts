import { NextRequest, NextResponse } from 'next/server';
import { upsertTimelineEvent } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';
import { InvestigationTimelineEvent } from '@/lib/types/investigation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, event } = body as { caseId: string; event: Partial<InvestigationTimelineEvent> };
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
    }
    const created: InvestigationTimelineEvent = {
      id: event.id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      timestamp: event.timestamp || new Date().toISOString(),
      title: event.title || 'Investigative Event',
      category: event.category || 'surveillance',
      description: event.description || '',
      involvedEntityIds: event.involvedEntityIds || [],
      source: event.source || 'manual',
      sourceRefId: event.sourceRefId,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    await upsertTimelineEvent(created);
    return NextResponse.json({ event: created });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
