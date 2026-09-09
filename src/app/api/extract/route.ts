import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODELS } from '@/lib/ai/groqClient';
import { sanitizeInvestigativeInput } from '@/lib/ai/sanitize';
import {
  SYSTEM_EXTRACTION_PROMPT,
  ExtractionResultSchema,
  heuristicExtract,
  ExtractionResult,
} from '@/lib/ai/extractionPrompt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, documentType = 'report', caseId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // 1. Sanitize & check prompt injection threats
    const sanitized = sanitizeInvestigativeInput(text);

    // 2. Check for Groq API
    const groq = getGroqClient();

    if (!groq) {
      // Offline / No API Key mode: Fallback to local heuristic extractor
      const heuristicResult = heuristicExtract(sanitized.cleanText);
      return NextResponse.json({
        success: true,
        source: 'heuristic_fallback',
        warning: 'Groq API Key not configured or unavailable. Used local heuristic NLP extractor.',
        flaggedThreats: sanitized.flaggedThreats,
        data: heuristicResult,
      });
    }

    // 3. Attempt extraction via Groq Primary Model
    try {
      const userPrompt = `
Analyze the following investigative document (Type: ${documentType}).
Extract all entities, typed relationships, and chronological events into strict JSON matching the schema:

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

      const rawJson = completion.choices[0]?.message?.content || '{}';
      const parsedJson = JSON.parse(rawJson);

      // Validate schema
      const validated = ExtractionResultSchema.safeParse(parsedJson);

      if (validated.success) {
        return NextResponse.json({
          success: true,
          source: 'groq_llama_70b',
          flaggedThreats: sanitized.flaggedThreats,
          data: validated.data,
        });
      }

      // If schema validation failed, try fast fallback model
      console.warn('Primary schema parse warning, attempting fallback model');
      const fallbackCompletion = await groq.chat.completions.create({
        model: GROQ_MODELS.FAST_INFERENCE,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_EXTRACTION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const fallbackJson = JSON.parse(fallbackCompletion.choices[0]?.message?.content || '{}');
      const fallbackValidated = ExtractionResultSchema.safeParse(fallbackJson);

      if (fallbackValidated.success) {
        return NextResponse.json({
          success: true,
          source: 'groq_llama_8b',
          flaggedThreats: sanitized.flaggedThreats,
          data: fallbackValidated.data,
        });
      }

      // If both LLM outputs failed validation, fallback to heuristic
      const heuristic = heuristicExtract(sanitized.cleanText);
      return NextResponse.json({
        success: true,
        source: 'heuristic_fallback_after_validation_error',
        flaggedThreats: sanitized.flaggedThreats,
        data: heuristic,
      });
    } catch (llmErr: any) {
      console.error('Groq LLM call failed, reverting to heuristic extraction:', llmErr);
      const heuristic = heuristicExtract(sanitized.cleanText);
      return NextResponse.json({
        success: true,
        source: 'heuristic_fallback_on_api_error',
        errorDetails: llmErr.message,
        flaggedThreats: sanitized.flaggedThreats,
        data: heuristic,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
