import { NextRequest, NextResponse } from 'next/server';
import { generateMockSocialDossier } from '@/lib/data/mockSocialMedia';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personName } = body;

    if (!personName || typeof personName !== 'string' || personName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Person name is required for social media intelligence lookup.' },
        { status: 400 }
      );
    }

    const dossier = generateMockSocialDossier(personName);

    return NextResponse.json({
      success: true,
      data: dossier,
      response: dossier.markdownReport,
    });
  } catch (err: any) {
    console.error('Social Intel API error:', err);
    return NextResponse.json(
      { error: `Social Media Intel processing failed: ${err.message || 'Internal error'}` },
      { status: 500 }
    );
  }
}
