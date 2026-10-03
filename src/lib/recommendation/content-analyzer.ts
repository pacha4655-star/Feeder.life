import { AnimalWelfareTopic, ANIMAL_WELFARE_TOPICS } from './config';

const TOPIC_KEYWORDS: Record<AnimalWelfareTopic, RegExp> = {
  dogs: /\b(dog|dogs|puppy|puppies|canine|pup|stray dog|indie dog|hound)\b/i,
  cats: /\b(cat|cats|kitten|kittens|feline|kitty|stray cat)\b/i,
  birds: /\b(bird|birds|pigeon|parrot|sparrow|crow|avian|eagle|owl)\b/i,
  cattle: /\b(cow|cows|calf|cattle|bull|buffalo|goat|sheep)\b/i,
  wildlife: /\b(wildlife|monkey|squirrel|deer|snake|reptile|forest)\b/i,
  rescue: /\b(rescue|rescued|injured|emergency|treatment|ambulance|rehab|saved|critical)\b/i,
  feeding: /\b(feeding|fed|stray feeding|food drive|kibble|rice|meals|hungry|nourish)\b/i,
  adoption: /\b(adoption|adopt|foster|forever home|rehome|puppy adoption|kitten adoption)\b/i,
  welfare: /\b(welfare|advocate|guardian|protection|care|shelter|sanctuary)\b/i,
  veterinary: /\b(vet|veterinary|vaccine|vaccination|surgery|doctor|medicine|sterilization|neutered|spayed)\b/i,
  pet_care: /\b(pet care|grooming|brushing|leash|dog training|cat care|pet health)\b/i,
  street_animals: /\b(street animal|stray|strays|community dog|community cat|free roaming)\b/i,
  lost_found: /\b(lost|found|missing|reunited|collar|lost dog|lost cat)\b/i,
  animal_rights: /\b(animal rights|cruelty|illegal|advocacy|justice|legal protection)\b/i,
  community: /\b(community|volunteer|meetup|volunteers|drive|group|team|event|local)\b/i,
  education: /\b(guide|tips|how to|education|training|nutrition|awareness|safety|learn)\b/i,
  animal_safety: /\b(safety|first aid|heatstroke|toxic food|poison|emergency care)\b/i,
  emergency_rescue: /\b(emergency rescue|sos|critical condition|hit and run|trapped|distress)\b/i,
};

export interface ContentAnalysisResult {
  topics: AnimalWelfareTopic[];
  qualityScore: number;
  isMediaRich: boolean;
  isVideo: boolean;
  videoDurationSec?: number;
}

export class ContentAnalyzer {
  /**
   * Extracts animal welfare topics from text, tags, and content type.
   */
  static extractTopics(post: {
    content?: string;
    hashtags?: string[];
    title?: string;
    contentType?: string;
    animalType?: string;
  }): AnimalWelfareTopic[] {
    const combinedText = [
      post.title || '',
      post.content || '',
      (post.hashtags || []).join(' '),
      post.contentType || '',
      post.animalType || '',
    ].join(' ');

    const detected: AnimalWelfareTopic[] = [];

    for (const topic of ANIMAL_WELFARE_TOPICS) {
      const regex = TOPIC_KEYWORDS[topic];
      if (regex && regex.test(combinedText)) {
        detected.push(topic);
      }
    }

    // Default fallbacks based on content_type if nothing explicit is found
    if (detected.length === 0) {
      if (post.contentType === 'FEEDING_UPDATE') detected.push('feeding');
      else if (post.contentType === 'HELP_REQUEST' || post.contentType === 'SOS_PREVIEW') detected.push('rescue');
      else if (post.contentType === 'ADOPTION') detected.push('adoption');
      else if (post.contentType === 'LOST_FOUND') detected.push('lost_found');
      else detected.push('welfare');
    }

    return detected;
  }

  /**
   * Computes content quality score between 0.0 and 1.0.
   * Rewards clear descriptive captions, verified authors, and valid media.
   * Penalizes spam, empty captions, or broken media.
   */
  static computeQualityScore(post: {
    content?: string;
    media?: any[];
    author?: { is_verified?: boolean; feeder_level?: string };
    hashtags?: string[];
  }): number {
    let score = 0.5; // Baseline

    const contentLen = (post.content || '').trim().length;

    // Caption quality: reward 20-300 characters
    if (contentLen >= 30 && contentLen <= 1000) {
      score += 0.2;
    } else if (contentLen < 10) {
      score -= 0.15; // Extremely short/empty caption
    }

    // Media richness
    const mediaList = Array.isArray(post.media) ? post.media : [];
    if (mediaList.length > 0) {
      score += 0.15;
      if (mediaList.length >= 2) score += 0.05;
    }

    // Author verification & credibility
    if (post.author?.is_verified) {
      score += 0.1;
    }

    // Anti-spam checks: excessive duplicate characters or excessive hashtags (>12)
    const tagsCount = Array.isArray(post.hashtags) ? post.hashtags.length : 0;
    if (tagsCount > 12) {
      score -= 0.15;
    }

    const repetitiveMatch = (post.content || '').match(/(.)\1{6,}/);
    if (repetitiveMatch) {
      score -= 0.2; // Repeated characters spam
    }

    return Math.max(0.05, Math.min(1.0, score));
  }
}
