import { InvestigationEntity, IdentityMatchCandidate } from '../types/investigation';

/**
 * Normalized Levenshtein similarity distance between two strings
 * Returns value between 0.0 (completely distinct) and 1.0 (exact match)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

/**
 * Checks whether one name is an abbreviation or token anagram of another
 * e.g. "R. Sharma" and "Rahul Sharma"
 */
export function isAbbreviationMatch(name1: string, name2: string): boolean {
  const tokens1 = name1.toLowerCase().split(/\s+/).filter(Boolean);
  const tokens2 = name2.toLowerCase().split(/\s+/).filter(Boolean);

  if (tokens1.length === 0 || tokens2.length === 0) return false;

  // If last name matches
  const last1 = tokens1[tokens1.length - 1];
  const last2 = tokens2[tokens2.length - 1];
  if (stringSimilarity(last1, last2) > 0.85) {
    // Check initials
    const firstInitial1 = tokens1[0][0];
    const firstInitial2 = tokens2[0][0];
    if (firstInitial1 === firstInitial2) {
      return true;
    }
  }
  return false;
}

/**
 * Scan all entities in a case and detect candidate duplicate identities
 */
export function findIdentityCandidates(entities: InvestigationEntity[]): IdentityMatchCandidate[] {
  const candidates: IdentityMatchCandidate[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      // Only match entities of the same general type
      if (a.type !== b.type) continue;

      let score = 0;
      const matching: string[] = [];
      const conflicting: string[] = [];

      // 1. Name and Alias matching
      const nameSim = stringSimilarity(a.label, b.label);
      const isAbbr = isAbbreviationMatch(a.label, b.label);

      // Check alias cross-matching
      const allNamesA = [a.label, ...(a.aliases || [])];
      const allNamesB = [b.label, ...(b.aliases || [])];

      let maxAliasSim = 0;
      for (const na of allNamesA) {
        for (const nb of allNamesB) {
          const sim = stringSimilarity(na, nb);
          if (sim > maxAliasSim) maxAliasSim = sim;
        }
      }

      const bestSim = Math.max(nameSim, maxAliasSim);
      if (bestSim >= 0.75) {
        score += 0.55;
        matching.push(`High name/alias similarity (${(bestSim * 100).toFixed(0)}%)`);
      } else if (isAbbr) {
        score += 0.45;
        matching.push('Compatible initials and matching surname');
      }

      // 2. Phone number match
      const phoneA = a.attributes?.phone || a.attributes?.number;
      const phoneB = b.attributes?.phone || b.attributes?.number;
      if (phoneA && phoneB) {
        const cleanA = String(phoneA).replace(/\D/g, '');
        const cleanB = String(phoneB).replace(/\D/g, '');
        if (cleanA.length >= 7 && cleanB.length >= 7) {
          if (cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA)) {
            score += 0.45;
            matching.push(`Matching phone number: ${phoneA}`);
          } else {
            score -= 0.15;
            conflicting.push(`Different registered phone numbers (${phoneA} vs ${phoneB})`);
          }
        }
      }

      // 3. Location / Address match
      const locA = a.attributes?.address || a.attributes?.location;
      const locB = b.attributes?.address || b.attributes?.location;
      if (locA && locB) {
        const locSim = stringSimilarity(String(locA), String(locB));
        if (locSim >= 0.75) {
          score += 0.25;
          matching.push(`Matching geographic location (${locA})`);
        }
      }

      // 4. Vehicle Plate match
      const plateA = a.attributes?.plate || a.attributes?.registration;
      const plateB = b.attributes?.plate || b.attributes?.registration;
      if (plateA && plateB) {
        if (String(plateA).replace(/\s|-/g, '').toUpperCase() === String(plateB).replace(/\s|-/g, '').toUpperCase()) {
          score += 0.5;
          matching.push(`Exact matching vehicle registration plate: ${plateA}`);
        }
      }

      // 5. Check age/attribute conflicts
      if (a.attributes?.age && b.attributes?.age) {
        if (Math.abs(Number(a.attributes.age) - Number(b.attributes.age)) > 4) {
          score -= 0.2;
          conflicting.push(`Significant age discrepancy (${a.attributes.age} vs ${b.attributes.age} years)`);
        } else {
          matching.push('Consistent reported age');
        }
      }

      const finalScore = Number(Math.max(0, Math.min(0.99, score)).toFixed(2));

      if (finalScore >= 0.45 && matching.length > 0) {
        candidates.push({
          id: `cand_${a.id}_${b.id}`,
          entityA: a,
          entityB: b,
          similarityScore: finalScore,
          matchingAttributes: matching,
          conflictingAttributes: conflicting,
          reason: `Potential identity match (${(finalScore * 100).toFixed(0)}% confidence): ${matching.join('; ')}`,
          status: 'pending',
        });
      }
    }
  }

  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  return candidates;
}
