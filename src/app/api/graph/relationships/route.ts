import { NextRequest, NextResponse } from 'next/server';
import { upsertRelationship, updateRelationshipProps, deleteRelationshipById } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';
import { InvestigationRelationship } from '@/lib/types/investigation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { relationship: relData, caseId, threadColor } = body as {
      relationship: Partial<InvestigationRelationship>;
      caseId: string;
      threadColor?: string;
    };
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
    }
    if (!relData.sourceId || !relData.targetId) {
      return NextResponse.json({ error: 'Source and target entities are required.' }, { status: 400 });
    }
    if (relData.sourceId === relData.targetId) {
      return NextResponse.json({ error: 'Source and target must differ.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const rel: InvestigationRelationship = {
      // Caller-supplied ids (undo/redo restore) are honored; otherwise generated
      id: relData.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      sourceId: relData.sourceId,
      targetId: relData.targetId,
      predicate: relData.predicate || 'ASSOCIATED_WITH',
      label: relData.label || 'Connected',
      weight: relData.weight || 1,
      confidence: relData.confidence ?? 0.85,
      status: relData.status || 'investigator_confirmed',
      threadColor: (relData.threadColor || threadColor || 'crimson') as InvestigationRelationship['threadColor'],
      validFrom: relData.validFrom,
      validTo: relData.validTo,
      provenance:
        relData.provenance || {
          sourceId: 'manual',
          sourceType: 'fir',
          sourceTitle: 'Manual Pin Connection',
          confidence: 1.0,
        },
      notes: relData.notes || '',
      manuallyConfirmed: relData.manuallyConfirmed ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await upsertRelationship(rel);
    return NextResponse.json({ relationship: rel });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { relationshipId, updates } = body as {
      relationshipId: string;
      updates: Partial<InvestigationRelationship>;
    };
    if (!relationshipId || !updates) {
      return NextResponse.json({ error: 'relationshipId and updates are required.' }, { status: 400 });
    }
    const updated = await updateRelationshipProps(relationshipId, updates);
    if (!updated) {
      return NextResponse.json({ error: `Relationship ${relationshipId} not found.` }, { status: 404 });
    }
    return NextResponse.json({ relationship: updated });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 });
    }
    const deleted = await deleteRelationshipById(id);
    return NextResponse.json({ deleted, id });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
