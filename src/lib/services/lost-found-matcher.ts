import { sanitizeText } from '@/lib/security/sanitize';

export interface LostFoundReportData {
  report_type: 'LOST' | 'FOUND';
  animal_name?: string;
  species: 'Dog' | 'Cat' | 'Cattle' | 'Bird' | 'Other' | string;
  breed?: string;
  coat_color: string;
  distinctive_markings?: string;
  approx_age?: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  date_lost_found: string;
  approx_location_name: string;
  approx_lat?: number;
  approx_lon?: number;
  media_urls: string[];
  description: string;
  contact_preference: 'IN_APP' | 'PHONE_ON_REQUEST' | 'COMMUNITY';
  contact_phone?: string;
  reporter_name?: string;
  reporter_avatar?: string;
  matches?: MatchCandidate[];
}

export interface MatchCandidate {
  candidate_id: string;
  candidate_report_type: 'LOST' | 'FOUND';
  similarity_score: number;
  confidence_label: string;
  match_reasons: string[];
  status: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED' | 'INCORRECT';
  notes?: string;
  matched_at: string;
}

export interface LostFoundRecord {
  id: string;
  user_id: string;
  status: 'ACTIVE' | 'MATCH_SUGGESTED' | 'RESOLVED' | 'CLOSED';
  data: LostFoundReportData;
  created_at: string;
  updated_at?: string;
}

// Tokenize text into normalized unique words for similarity checks
function tokenize(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Compute haversine distance in km
function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    (lat1 === 0 && lon1 === 0) ||
    (lat2 === 0 && lon2 === 0)
  ) {
    return null;
  }
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class LostFoundMatcher {
  /**
   * Computes a multi-factor similarity score between a LOST report and a FOUND report.
   * Safety notice: Always framed as a potential candidate for human confirmation.
   */
  static evaluateSimilarity(
    source: LostFoundRecord,
    target: LostFoundRecord
  ): {
    similarityScore: number;
    confidenceLabel: string;
    matchReasons: string[];
    isPotentialMatch: boolean;
  } {
    const sData = source.data;
    const tData = target.data;

    let score = 0;
    const reasons: string[] = [];

    // 1. Species compatibility (Mandatory gate)
    const sSpecies = (sData.species || '').toLowerCase().trim();
    const tSpecies = (tData.species || '').toLowerCase().trim();
    if (sSpecies && tSpecies) {
      if (sSpecies === tSpecies) {
        score += 30;
        reasons.push(`Matching animal species (${sData.species})`);
      } else {
        // Incompatible species cannot be a match
        return {
          similarityScore: 0,
          confidenceLabel: 'Incompatible Species',
          matchReasons: ['Species mismatch'],
          isPotentialMatch: false,
        };
      }
    } else {
      score += 10;
    }

    // 2. Gender compatibility
    if (sData.gender && tData.gender) {
      if (sData.gender === tData.gender && sData.gender !== 'UNKNOWN') {
        score += 10;
        reasons.push(`Matching gender (${sData.gender})`);
      } else if (sData.gender === 'UNKNOWN' || tData.gender === 'UNKNOWN') {
        score += 5;
      } else {
        // Direct mismatch
        score -= 10;
      }
    }

    // 3. Coat Color token overlap
    const sColors = tokenize(sData.coat_color);
    const tColors = tokenize(tData.coat_color);
    const matchingColors = sColors.filter((c) => tColors.includes(c));
    if (matchingColors.length > 0) {
      const colorPoints = Math.min(25, matchingColors.length * 12);
      score += colorPoints;
      reasons.push(`Similar coat coloring (${matchingColors.join(', ')})`);
    }

    // 4. Breed token overlap
    const sBreeds = tokenize(sData.breed);
    const tBreeds = tokenize(tData.breed);
    const matchingBreeds = sBreeds.filter((b) => tBreeds.includes(b));
    if (matchingBreeds.length > 0) {
      score += 15;
      reasons.push(`Similar breed classification (${matchingBreeds.join(', ')})`);
    }

    // 5. Distinctive Markings token overlap (collars, ears, patches, tails, tags)
    const sMarks = tokenize(sData.distinctive_markings);
    const tMarks = tokenize(tData.distinctive_markings);
    const matchingMarks = sMarks.filter((m) => tMarks.includes(m));
    if (matchingMarks.length > 0) {
      score += 15;
      reasons.push(`Matching physical feature cues (${matchingMarks.slice(0, 3).join(', ')})`);
    }

    // 6. Date proximity
    if (sData.date_lost_found && tData.date_lost_found) {
      const sDate = new Date(sData.date_lost_found).getTime();
      const tDate = new Date(tData.date_lost_found).getTime();
      const diffDays = Math.abs(tDate - sDate) / (1000 * 60 * 60 * 24);

      if (diffDays <= 7) {
        score += 10;
        reasons.push(`Reported dates are within ${Math.ceil(diffDays)} day(s) of each other`);
      } else if (diffDays <= 21) {
        score += 5;
        reasons.push(`Reported dates within 3 weeks`);
      }
    }

    // 7. Geographic proximity
    const dist = calculateDistanceKm(
      sData.approx_lat,
      sData.approx_lon,
      tData.approx_lat,
      tData.approx_lon
    );

    if (dist !== null) {
      if (dist <= 2.0) {
        score += 15;
        reasons.push(`Very close vicinity (~${dist.toFixed(1)} km radius)`);
      } else if (dist <= 5.0) {
        score += 10;
        reasons.push(`Nearby neighborhood (~${dist.toFixed(1)} km radius)`);
      } else if (dist <= 15.0) {
        score += 5;
        reasons.push(`Within metropolitan area (~${dist.toFixed(1)} km radius)`);
      } else if (dist > 35.0) {
        score -= 15;
      }
    } else {
      // Landmark token match fallback
      const sLoc = tokenize(sData.approx_location_name);
      const tLoc = tokenize(tData.approx_location_name);
      const matchingLocs = sLoc.filter((l) => tLoc.includes(l));
      if (matchingLocs.length > 0) {
        score += 8;
        reasons.push(`Matching location keywords: ${matchingLocs.join(', ')}`);
      }
    }

    // Clamp score to 0 - 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let confidenceLabel = 'Review Suggested Match';
    if (finalScore >= 75) {
      confidenceLabel = 'High Potential Similarity';
    } else if (finalScore >= 50) {
      confidenceLabel = 'Moderate Potential Similarity';
    } else {
      confidenceLabel = 'Possible Low Similarity';
    }

    return {
      similarityScore: finalScore,
      confidenceLabel,
      matchReasons: reasons,
      isPotentialMatch: finalScore >= 45,
    };
  }
}
