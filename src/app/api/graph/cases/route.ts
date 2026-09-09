import { NextRequest, NextResponse } from 'next/server';
import { listCases, upsertCase, deleteCase } from '@/lib/graph/neo4j';
import { graphErrorResponse } from '../_shared';
import { InvestigationCase } from '@/lib/types/investigation';

export async function GET() {
  try {
    const cases = await listCases();
    return NextResponse.json({ cases });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const caseData = body as Partial<InvestigationCase>;
    if (!caseData.title || typeof caseData.title !== 'string') {
      return NextResponse.json({ error: 'Case title is required.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const newCase: InvestigationCase = {
      id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title: caseData.title,
      caseNumber:
        caseData.caseNumber || `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: caseData.description || '',
      status: 'active',
      priority: caseData.priority || 'medium',
      leadInvestigator: caseData.leadInvestigator || 'Unassigned',
      jurisdiction: caseData.jurisdiction || 'Unspecified',
      incidentDate: caseData.incidentDate,
      createdAt: now,
      updatedAt: now,
      tags: caseData.tags || ['active_inquiry'],
    };
    await upsertCase(newCase);
    return NextResponse.json({ caseItem: newCase });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, updates } = body as { caseId: string; updates: Partial<InvestigationCase> };
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
    }
    const existing = (await listCases()).find((s) => s.caseItem.id === caseId);
    if (!existing) {
      return NextResponse.json({ error: `Case ${caseId} not found.` }, { status: 404 });
    }
    const updated: InvestigationCase = {
      ...existing.caseItem,
      ...updates,
      id: caseId, // identity is immutable
      updatedAt: new Date().toISOString(),
    };
    await upsertCase(updated);
    return NextResponse.json({ caseItem: updated });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caseId = req.nextUrl.searchParams.get('caseId');
    if (!caseId) {
      return NextResponse.json({ error: 'caseId query parameter is required.' }, { status: 400 });
    }
    await deleteCase(caseId);
    return NextResponse.json({ deleted: caseId });
  } catch (err) {
    return graphErrorResponse(err);
  }
}

export const dynamic = 'force-dynamic';
