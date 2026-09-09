import { InvestigationEntity, PublicIntelSubmission } from '../types/investigation';

/**
 * Tip Credibility Triage
 * Transparent heuristic scoring of public intelligence submissions, shown to the
 * investigator as an explicit factor breakdown. This is a triage aid — never a
 * verdict on the tip's truth (Responsible AI: leads, not accusations).
 */

export interface CredibilityFactor {
  label: string;
  points: number;
}

export interface CredibilityAssessment {
  score: number; // 0..1
  factors: CredibilityFactor[];
}

const PLATE_RE = /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{0,3}[\s-]?\d{1,4}\b/i;
const PHONE_RE = /(\+?\d[\d\s-]{8,14}\d)/;
const TIME_RE = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(am|pm|hrs|hours)\b/i;
const COORD_RE = /-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,2}\.\d{3,}/;

export function scoreTipCredibility(
  content: string,
  options: {
    sourceCategory?: PublicIntelSubmission['sourceCategory'];
    locationMentioned?: string;
    knownEntities?: InvestigationEntity[];
  } = {}
): CredibilityAssessment {
  const factors: CredibilityFactor[] = [];
  let score = 0.3; // neutral baseline: unverified but plausible

  // 1. Substantive detail (longer, more descriptive tips)
  if (content.length >= 200) {
    score += 0.15;
    factors.push({ label: 'Substantial descriptive detail', points: 0.15 });
  } else if (content.length >= 80) {
    score += 0.1;
    factors.push({ label: 'Meaningful detail provided', points: 0.1 });
  } else {
    factors.push({ label: 'Very short submission', points: 0 });
  }

  // 2. Verifiable specifics
  if (PLATE_RE.test(content)) {
    score += 0.1;
    factors.push({ label: 'Cites vehicle registration', points: 0.1 });
  }
  if (PHONE_RE.test(content)) {
    score += 0.1;
    factors.push({ label: 'Cites contact number', points: 0.1 });
  }
  if (TIME_RE.test(content)) {
    score += 0.05;
    factors.push({ label: 'Cites time of observation', points: 0.05 });
  }
  if (COORD_RE.test(content)) {
    score += 0.05;
    factors.push({ label: 'Cites precise coordinates', points: 0.05 });
  }

  // 3. Named location
  if (options.locationMentioned && options.locationMentioned.trim().length > 2) {
    score += 0.05;
    factors.push({ label: `Named location: ${options.locationMentioned}`, points: 0.05 });
  }

  // 4. Corroboration against the existing knowledge graph
  if (options.knownEntities && options.knownEntities.length > 0) {
    const lower = content.toLowerCase();
    const matched = options.knownEntities.filter((ent) => {
      const names = [ent.label, ...(ent.aliases || [])].map((n) => n.toLowerCase());
      if (names.some((n) => n.length > 3 && lower.includes(n))) return true;
      // attribute corroboration: phones, plates, IMEIs mentioned in the tip
      const attrText = JSON.stringify(ent.attributes || {}).toLowerCase();
      if (attrText.length > 4 && lower.includes(attrText)) return true;
      const plate = ent.attributes?.plate || ent.attributes?.registration;
      if (plate && lower.includes(String(plate).toLowerCase())) return true;
      const phone = ent.attributes?.phone || ent.attributes?.number;
      if (phone) {
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length >= 7 && lower.replace(/\D/g, '').includes(digits)) return true;
      }
      return false;
    });
    if (matched.length > 0) {
      const points = Math.min(0.2, 0.1 * matched.length);
      score += points;
      factors.push({
        label: `Corroborates ${matched.length} existing case entit${matched.length > 1 ? 'ies' : 'y'} (${matched
          .slice(0, 3)
          .map((m) => m.label)
          .join(', ')})`,
        points,
      });
    }
  }

  // 5. Source category prior — identified witnesses carry slightly more weight than anonymous
  if (options.sourceCategory === 'witness_portal' || options.sourceCategory === 'hotline') {
    score += 0.05;
    factors.push({ label: `${options.sourceCategory.replace('_', ' ')} source (semi-identified)`, points: 0.05 });
  }

  return { score: Number(Math.min(0.95, Math.max(0, score)).toFixed(2)), factors };
}
