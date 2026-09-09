import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODELS } from '@/lib/ai/groqClient';
import { sanitizeInvestigativeInput } from '@/lib/ai/sanitize';
import {
  SYSTEM_EXTRACTION_PROMPT,
  parseAndNormalizeExtraction,
} from '@/lib/ai/extractionPrompt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, documentType = 'report', caseId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text content is required for extraction.' }, { status: 400 });
    }

    // 1. Sanitize & check prompt injection threats
    const sanitized = sanitizeInvestigativeInput(text);

    // 2. Check Groq API configuration
    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        {
          error:
            'Groq API Key is not configured in server environment (GROQ_API_KEY). AI entity extraction cannot proceed.',
        },
        { status: 500 }
      );
    }

    // 3. Execute Groq Extraction
    const userPrompt = `
Analyze the following investigative document (Type: ${documentType}).
Extract all entities, typed relationships, and chronological events into strict JSON:

<investigative_text_to_analyze>
${sanitized.cleanText}
</investigative_text_to_analyze>
`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODELS.PRIMARY_REASONING,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_EXTRACTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawJson = completion.choices[0]?.message?.content;
    if (!rawJson) {
      return NextResponse.json(
        { error: 'Groq LLM returned an empty completion response.' },
        { status: 500 }
      );
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse Groq model output as JSON: ${parseErr.message}` },
        { status: 500 }
      );
    }

    // Parse and normalize into CrimeLens investigative types
    const extractionData = parseAndNormalizeExtraction(parsedJson);

    return NextResponse.json({
      success: true,
      source: 'groq_ai_extraction',
      flaggedThreats: sanitized.flaggedThreats,
      data: extractionData,
    });
  } catch (err: any) {
    console.error('Groq extraction error:', err);
    return NextResponse.json(
      {
        error: `Groq AI Extraction failed: ${err.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
