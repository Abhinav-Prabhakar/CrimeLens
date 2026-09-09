import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODELS } from '@/lib/ai/groqClient';
import { sanitizeInvestigativeInput } from '@/lib/ai/sanitize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, caseContext, history } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required for assistant inquiry.' }, { status: 400 });
    }

    const sanitized = sanitizeInvestigativeInput(query);
    const groq = getGroqClient();

    if (!groq) {
      return NextResponse.json(
        {
          error:
            'Groq API Key is not configured in server environment (GROQ_API_KEY). AI Assistant reasoning cannot proceed.',
        },
        { status: 500 }
      );
    }

    // Rolling conversation memory (last 8 turns), sanitized like the live query —
    // prior assistant text is also untrusted from the server's perspective.
    const priorTurns: { role: 'user' | 'assistant'; content: string }[] = (Array.isArray(history) ? history : [])
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.text === 'string' && m.text.trim())
      .slice(-8)
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: sanitizeInvestigativeInput(m.text).cleanText.slice(0, 4000),
      }));

    // Context format
    const contextSummary = caseContext
      ? `
CASE TITLE: ${caseContext.title || 'Unknown'}
LEAD INVESTIGATOR: ${caseContext.leadInvestigator || 'Unassigned'}
ENTITIES RECORDED (${caseContext.entities?.length || 0}):
${(caseContext.entities || [])
  .slice(0, 30)
  .map((e: any) => `- [${e.type.toUpperCase()}] ${e.label} (Confidence: ${(e.confidence * 100).toFixed(0)}%, Status: ${e.status})`)
  .join('\n')}

KNOWN RELATIONSHIPS (${caseContext.relationships?.length || 0}):
${(caseContext.relationships || [])
  .slice(0, 40)
  .map((r: any) => `- ${r.sourceLabel || r.sourceId} --[${r.predicate} (${r.label || ''})]--> ${r.targetLabel || r.targetId} (Conf: ${(r.confidence * 100).toFixed(0)}%)`)
  .join('\n')}
`
      : 'No explicit case context passed.';

    const systemPrompt = `
You are CrimeLens Senior Investigative Analyst & Forensic Intelligence Advisor.
You assist detectives and intelligence officers in evaluating criminal network structures,
verifying evidence provenance, formulating alternative hypotheses, and suggesting investigative leads.

ETHICAL & RESPONSIBLE AI CONSTRAINTS:
1. NEVER declare guilt or make definitive legal pronouncements of criminal culpability.
2. Treat all correlations and predictions as LEADS requiring human verification.
3. Explicitly cite entities and relationships from the provided case context whenever answering.
4. If asked for legal charge assistance, suggest potentially applicable sections (e.g. IPC/BNS or equivalent statutes) strictly as investigative drafting aids requiring review by the public prosecutor.
5. If ambiguous evidence exists, provide MULTIPLE ALTERNATIVE HYPOTHESES with supporting and contradicting observations.
`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODELS.PRIMARY_REASONING,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `
CURRENT CASE EVIDENCE CONTEXT:
${contextSummary}

PRIOR CONVERSATION (for continuity; re-sanitized as untrusted):
${priorTurns.length > 0 ? priorTurns.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n') : '(none)'}

INVESTIGATOR QUERY / REQUEST:
<investigative_text_to_analyze>
${sanitized.cleanText}
</investigative_text_to_analyze>
`,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ error: 'Groq assistant returned an empty response.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      source: 'groq_llama_ai',
      response: reply,
    });
  } catch (err: any) {
    console.error('Assistant API error:', err);
    return NextResponse.json(
      { error: `Groq Assistant Reasoning failed: ${err.message || 'Internal error'}` },
      { status: 500 }
    );
  }
}
