import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, GROQ_MODELS } from '@/lib/ai/groqClient';
import { sanitizeInvestigativeInput } from '@/lib/ai/sanitize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, caseContext, mode = 'chat' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const sanitized = sanitizeInvestigativeInput(query);
    const groq = getGroqClient();

    // Context format
    const contextSummary = caseContext
      ? `
CASE TITLE: ${caseContext.title || 'Unknown'}
LEAD INVESTIGATOR: ${caseContext.leadInvestigator || 'Unassigned'}
ENTITIES RECORDED (${caseContext.entities?.length || 0}):
${(caseContext.entities || [])
  .slice(0, 25)
  .map((e: any) => `- [${e.type.toUpperCase()}] ${e.label} (Confidence: ${(e.confidence * 100).toFixed(0)}%, Status: ${e.status})`)
  .join('\n')}

KNOWN RELATIONSHIPS (${caseContext.relationships?.length || 0}):
${(caseContext.relationships || [])
  .slice(0, 30)
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

    if (!groq) {
      // Local fallback response when offline
      return NextResponse.json({
        success: true,
        source: 'local_offline_assistant',
        response: `[OFFLINE ANALYSIS]\nBased on current case entities (${caseContext?.entities?.length || 0} nodes), the primary network hubs center around ${caseContext?.entities?.[1]?.label || 'key suspects'}. Further physical evidence and CDR logs are recommended before drawing conclusions.\n\nInvestigative lead: Cross-reference burner phone activity with tower azimuth logs.`,
      });
    }

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

INVESTIGATOR QUERY / REQUEST:
<investigative_text_to_analyze>
${sanitized.cleanText}
</investigative_text_to_analyze>
`,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({
      success: true,
      source: 'groq_llama_70b',
      response: reply,
    });
  } catch (err: any) {
    console.error('Assistant API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
