/**
 * FeederSense — Feeder.life’s Hybrid Personalized Recommendation Engine
 *
 * FeederSense is Feeder.life’s hybrid personalized recommendation engine that ranks
 * content using user interests, engagement, watch/dwell time, author affinity, freshness,
 * discovery, negative feedback, content quality, and diversity signals.
 *
 * Product Version: FeederSense V1.0
 * Technical Version: v1.0.0
 */

export const ALGORITHM_NAME = 'FeederSense';
export const ALGORITHM_FULL_NAME = "FeederSense — Feeder.life’s Hybrid Personalized Recommendation Engine";
export const ALGORITHM_PRODUCT_VERSION = 'FeederSense V1.0';
export const ALGORITHM_TECHNICAL_VERSION = 'v1.0.0';

export interface RankingWeights {
  interest: number;
  watch: number;
  engagement: number;
  authorAffinity: number;
  save: number;
  share: number;
  freshness: number;
  quality: number;
  discovery: number;
  negativeFeedbackPenalty: number;
}

export interface RecommendationConfig {
  algorithmName?: string;
  algorithmVersion: string;
  weights: RankingWeights;
  freshnessDecayHours: number;
  explorationRatio: number;
  diversity: {
    maxConsecutiveSameAuthor: number;
    maxConsecutiveSameTopic: number;
  };
  dwellTimeThresholdMs: number;
}

export const FEEDER_RECOMMENDATION_CONFIG_V1: RecommendationConfig = {
  algorithmName: ALGORITHM_NAME,
  algorithmVersion: ALGORITHM_TECHNICAL_VERSION,
  weights: {
    interest: 0.22,
    watch: 0.16,
    engagement: 0.14,
    authorAffinity: 0.12,
    save: 0.10,
    share: 0.08,
    freshness: 0.07,
    quality: 0.05,
    discovery: 0.06,
    negativeFeedbackPenalty: 1.0,
  },
  freshnessDecayHours: 48,
  explorationRatio: 0.15, // 15% slots allocated for cold-start & new creator exploration
  diversity: {
    maxConsecutiveSameAuthor: 3,
    maxConsecutiveSameTopic: 3,
  },
  dwellTimeThresholdMs: 2000, // 2 seconds threshold for meaningful image/text dwell
};

export const FEEDERSENSE_CONFIG_V1 = FEEDER_RECOMMENDATION_CONFIG_V1;

export const ANIMAL_WELFARE_TOPICS = [
  'dogs',
  'cats',
  'birds',
  'cattle',
  'wildlife',
  'rescue',
  'feeding',
  'adoption',
  'welfare',
  'veterinary',
  'pet_care',
  'street_animals',
  'lost_found',
  'animal_rights',
  'community',
  'education',
  'animal_safety',
  'emergency_rescue',
] as const;

export type AnimalWelfareTopic = (typeof ANIMAL_WELFARE_TOPICS)[number];
