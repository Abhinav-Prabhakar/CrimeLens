import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGroqClient, GROQ_MODELS } from '@/lib/ai/groqClient';

/**
 * Forensic Image & Object Analysis — real multimodal inference via Groq.
 * Zero-fallback: missing key, oversized payload, model failure, or unparsable
 * output all return explicit errors. No simulated detections.
 */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB decoded guard on base64 length

const VisionResultSchema = z.object({
  classification: z.string(),
  description: z.string(),
  licensePlate: z.string().nullable().optional(),
  vehicleDetails: z.string().nullable().optional(),
  forensicDetails: z.string().nullable().optional(),
  confidence: z.coerce.number().min(0).max(1),
  uncertainty: z.string(),
});

const SYSTEM_VISION_PROMPT = `You are CrimeLens Forensic Vision Analyst.
You receive a single image submitted as evidence in a criminal investigation (CCTV still, surveillance photo, forensic macro photograph, or seized item documentation).

RESPONSIBLE AI CONSTRAINTS:
1. Describe only what is visibly present. NEVER speculate about guilt or identity beyond visible content.
2. If the image is too ambiguous to classify, say so explicitly and assign low confidence.
3. Read vehicle license plates ONLY if genuinely legible; otherwise return null.
4. Every result MUST include an uncertainty statement describing limits of the analysis.

OUTPUT: strictly a raw JSON object (no markdown fences) matching:
{
  "classification": "short object/scene category, e.g. 'Sedan Vehicle', 'Latent Fingerprint', 'Burglary Tool Set'",
  "description": "2-4 sentence factual description of visible content",
  "licensePlate": "plate string or null",
  "vehicleDetails": "make/model/color estimate with caveat, or null",
  "forensicDetails": "notable forensic markings, damage, residue, or null",
  "confidence": 0.0-1.0,
  "uncertainty": "explicit statement of analysis limits and required corroboration"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, contextNote } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'An image payload (base64) is required.' }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image exceeds the 4 MB forensic upload limit. Downscale and retry.' },
        { status: 413 }
      );
    }

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        {
          error:
            'Groq API Key is not configured in server environment (GROQ_API_KEY). Forensic vision analysis cannot proceed.',
        },
        { status: 500 }
      );
    }

    const dataUrl = `data:${typeof mimeType === 'string' ? mimeType : 'image/jpeg'};base64,${imageBase64}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODELS.VISION,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_VISION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this evidence image.${contextNote ? ` Investigator context: ${String(contextNote).slice(0, 500)}` : ''}` },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const rawJson = completion.choices[0]?.message?.content;
    if (!rawJson) {
      return NextResponse.json({ error: 'Vision model returned an empty completion.' }, { status: 500 });
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse vision model output as JSON: ${parseErr.message}` },
        { status: 500 }
      );
    }

    const parsed = VisionResultSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Vision model output failed schema validation: ${parsed.error.issues[0]?.message || 'unknown'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, source: 'groq_vision_llama4_scout', data: parsed.data });
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    return NextResponse.json(
      { error: `Forensic vision analysis failed: ${err?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
