import { NextRequest, NextResponse } from 'next/server';
import { upsertEntity, deleteEntityCascade, getCaseState, getEntityCaseId } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';
import { InvestigationEntity } from '@/lib/types/investigation';

function normalizeEntityInput(input: Partial<InvestigationEntity>, caseId?: string): Partial<InvestigationEntity> {
  return { ...input, caseId: input.caseId || caseId };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity: entityData, caseId } = body as { entity: Partial<InvestigationEntity>; caseId: string };
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
    }
    if (!entityData.label || typeof entityData.label !== 'string') {
      return NextResponse.json({ error: 'Entity label is required.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const input = normalizeEntityInput(entityData, caseId);
    const entity: InvestigationEntity = {
      id: input.id || `ent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      caseId,
      type: input.type || 'person',
      // entityData.label is guard-validated above; the spread loses that narrowing
      label: entityData.label,
      aliases: input.aliases || [],
      attributes: input.attributes || {},
      confidence: input.confidence ?? 0.85,
      status: input.status || 'investigator_confirmed',
      provenance:
        input.provenance || {
          sourceId: 'manual',
          sourceType: 'fir',
          sourceTitle: 'Manual Investigator Entry',
          confidence: 1.0,
        },
      boardPosition: input.boardPosition || { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 30 },
      visualType: input.visualType || 'suspect',
      notes: input.notes || '',
      tags: input.tags || [],
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    await upsertEntity(entity);
    return NextResponse.json({ entity });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId, updates } = body as { entityId: string; updates: Partial<InvestigationEntity> };
    if (!entityId || !updates) {
      return NextResponse.json({ error: 'entityId and updates are required.' }, { status: 400 });
    }

    // Merge onto the persisted record so partial updates keep stored fields intact
    const caseId = updates.caseId || (await getEntityCaseId(entityId));
    if (!caseId) {
      return NextResponse.json({ error: `Entity ${entityId} not found.` }, { status: 404 });
    }
    const state = await getCaseState(caseId);
    const existing = state.entities.find((e) => e.id === entityId);
    if (!existing) {
      return NextResponse.json({ error: `Entity ${entityId} not found in case ${caseId}.` }, { status: 404 });
    }
    const updated: InvestigationEntity = {
      ...existing,
      ...updates,
      id: entityId, // identity is immutable
      caseId,
      updatedAt: new Date().toISOString(),
    };
    await upsertEntity(updated);
    return NextResponse.json({ entity: updated });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const entityId = req.nextUrl.searchParams.get('id');
    if (!entityId) {
      return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 });
    }
    await deleteEntityCascade(entityId);
    return NextResponse.json({ deleted: entityId });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
