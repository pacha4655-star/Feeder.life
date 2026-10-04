import { FeederRecommendationEngine } from '../src/lib/recommendation/engine';
import { getSupabaseServerClient } from '../src/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

// Parse environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env: Record<string, string> = {};
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !env[match[1].trim()]) {
          env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  }
  return env;
}

const env = loadEnv();
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

function calcPercentiles(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return { p50: Math.round(p50), p75: Math.round(p75), p95: Math.round(p95), p99: Math.round(p99), avg: Math.round(avg) };
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('FEEDER.LIFE PERFORMANCE BASELINE MEASUREMENT');
  console.log('====================================================');

  const supabase = getSupabaseServerClient();

  // 1. Direct Supabase Query Latency
  console.log('\n[1] Measuring Supabase Database Direct Queries (10 iterations)...');
  const dbLatencies: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    await supabase
      .from('social_posts')
      .select('*')
      .eq('record_type', 'post')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(60);
    const t1 = performance.now();
    dbLatencies.push(t1 - t0);
  }
  const dbStats = calcPercentiles(dbLatencies);
  console.log(`  Supabase Candidate Query: p50=${dbStats.p50}ms, p75=${dbStats.p75}ms, p95=${dbStats.p95}ms, avg=${dbStats.avg}ms`);

  // 2. FeederSense Engine Latency (Candidate generation + Feature extraction + Scoring + Diversity reranking)
  console.log('\n[2] Measuring FeederSense V1.0 Ranking Pipeline Latency (15 iterations)...');
  const rankingLatencies: number[] = [];
  for (let i = 0; i < 15; i++) {
    const t0 = performance.now();
    const result = await FeederRecommendationEngine.getPersonalizedFeed({
      userId: 'guest',
      tab: 'FOR_YOU',
      limit: 10,
    });
    const t1 = performance.now();
    rankingLatencies.push(t1 - t0);
  }
  const rankingStats = calcPercentiles(rankingLatencies);
  console.log(`  FeederSense Pipeline: p50=${rankingStats.p50}ms, p75=${rankingStats.p75}ms, p95=${rankingStats.p95}ms, p99=${rankingStats.p99}ms, avg=${rankingStats.avg}ms`);

  // 3. User Affinity Profile Retrieval
  console.log('\n[3] Measuring User Profile & Affinity Lookup Latency (10 iterations)...');
  const userLatencies: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, profile_data')
      .limit(10);
    const t1 = performance.now();
    userLatencies.push(t1 - t0);
  }
  const userStats = calcPercentiles(userLatencies);
  console.log(`  User Lookup: p50=${userStats.p50}ms, p95=${userStats.p95}ms, avg=${userStats.avg}ms`);

  // 4. Communities Query
  console.log('\n[4] Measuring Communities Lookup Latency (10 iterations)...');
  const commLatencies: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    await supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, cover_url, avatar_url, is_private, rules, created_by, members, stats')
      .limit(20);
    const t1 = performance.now();
    commLatencies.push(t1 - t0);
  }
  const commStats = calcPercentiles(commLatencies);
  console.log(`  Communities Query: p50=${commStats.p50}ms, p95=${commStats.p95}ms, avg=${commStats.avg}ms`);

  console.log('\n====================================================');
  console.log('BASELINE MEASUREMENT SUMMARY:');
  console.log(`  Database Query p50: ${dbStats.p50}ms, p95: ${dbStats.p95}ms`);
  console.log(`  Feed/Ranking p50: ${rankingStats.p50}ms, p95: ${rankingStats.p95}ms`);
  console.log(`  User Profile p50: ${userStats.p50}ms, p95: ${userStats.p95}ms`);
  console.log(`  Communities p50: ${commStats.p50}ms, p95: ${commStats.p95}ms`);
  console.log('====================================================\n');
}

runBenchmark().catch(console.error);
