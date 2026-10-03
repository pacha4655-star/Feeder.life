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
  share: number;
  save: number;
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
    watch: 0.18,
    engagement: 0.15,
    authorAffinity: 0.12,
    share: 0.10,
    save: 0.08,
    freshness: 0.06,
    quality: 0.05,
    discovery: 0.04,
    negativeFeedbackPenalty: 1.0,
  },
  freshnessDecayHours: 24,
  explorationRatio: 0.15, // 15% slots allocated for cold-start & new creator exploration
  diversity: {
    maxConsecutiveSameAuthor: 2,
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
  'adoption',
  'feeding',
  'welfare',
  'veterinary',
  'lost_found',
  'community',
  'educational',
] as const;

export type AnimalWelfareTopic = (typeof ANIMAL_WELFARE_TOPICS)[number];
