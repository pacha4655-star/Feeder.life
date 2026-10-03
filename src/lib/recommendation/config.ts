/**
 * Feeder Recommendation Engine v1 — Configuration & Parameters
 *
 * Configurable, versioned scoring weights and hyperparameters for personalized
 * content ranking inspired by transparent recommendation principles.
 */

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
  algorithmVersion: 'v1.0.0',
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
