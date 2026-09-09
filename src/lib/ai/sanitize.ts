/**
 * Prompt Injection and Input Sanitization Guard
 * Protects CrimeLens AI extraction pipeline against adversarial content
 * hidden inside police reports, suspect statements, and public intel.
 */

const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /system\s+prompt/gi,
  /you\s+are\s+now\s+a/gi,
  /as\s+an\s+unrestricted\s+ai/gi,
  /forget\s+everything/gi,
  /disregard\s+(above|all)/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
];

export interface SanitizedInput {
  cleanText: string;
  flaggedThreats: string[];
  isClean: boolean;
}

export function sanitizeInvestigativeInput(rawInput: string): SanitizedInput {
  if (!rawInput || typeof rawInput !== 'string') {
    return { cleanText: '', flaggedThreats: [], isClean: true };
  }

  // Limit maximum character length to prevent buffer/DOS issues (max 60,000 characters ~ 15,000 tokens)
  let text = rawInput.slice(0, 60000);

  const flaggedThreats: string[] = [];

  for (const pattern of ADVERSARIAL_PATTERNS) {
    if (pattern.test(text)) {
      flaggedThreats.push(`Pattern detected: ${pattern.toString()}`);
      // Neutralize the injection pattern
      text = text.replace(pattern, '[DEFANGED_INJECTION_ATTEMPT]');
    }
  }

  // Normalize strange Unicode control characters while preserving valid formatting
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  return {
    cleanText: text,
    flaggedThreats,
    isClean: flaggedThreats.length === 0,
  };
}
