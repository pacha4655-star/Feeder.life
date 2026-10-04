import { FeederRecommendationEngine } from '../src/lib/recommendation/engine';
import { getSupabaseServerClient } from '../src/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

// Parse environment variables from .env or .env.local
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
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return {
    p50: Math.round(p50 * 10) / 10,
    p75: Math.round(p75 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    p99: Math.round(p99 * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg: Math.round(avg * 10) / 10,
  };
}

async function runFinalVerification() {
  console.log('================================================================');
  console.log('FEEDER.LIFE — FINAL PERFORMANCE VERIFICATION BENCHMARK');
  console.log('================================================================\n');

  const supabase = getSupabaseServerClient();

  // ---------------------------------------------------------
  // 1. CANDIDATE QUERY BENCHMARK (30 Iterations)
  // ---------------------------------------------------------
  console.log('--- [1] CANDIDATE QUERY LATENCY (30 Iterations) ---');
  const candidateLatencies: number[] = [];
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, user_id, community_id, record_type, content, data, media, hashtags, mentions, visibility, is_active, is_deleted, stats, reactions, comments, created_at')
      .eq('record_type', 'post')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    const t1 = performance.now();
    if (!error) {
      candidateLatencies.push(t1 - t0);
    } else {
      console.error('Candidate query error:', error);
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  const candMetrics = calcPercentiles(candidateLatencies);
  console.log(`Candidate Query: p50=${candMetrics.p50}ms | p75=${candMetrics.p75}ms | p95=${candMetrics.p95}ms | p99=${candMetrics.p99}ms | avg=${candMetrics.avg}ms`);

  // ---------------------------------------------------------
  // 2. SEARCH API LATENCY (25 Iterations per Category)
  // ---------------------------------------------------------
  console.log('\n--- [2] SEARCH LATENCIES (25 Iterations) ---');
  const queryTerm = 'feeder';

  // 2a. Users Search
  const userSearchLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, is_verified, profile_data')
      .eq('is_active', true)
      .or(`display_name.ilike.%${queryTerm}%,username.ilike.%${queryTerm}%`)
      .limit(8);
    const t1 = performance.now();
    userSearchLatencies.push(t1 - t0);
  }
  const userSearchMetrics = calcPercentiles(userSearchLatencies);
  console.log(`Users Search:       p50=${userSearchMetrics.p50}ms | p95=${userSearchMetrics.p95}ms`);

  // 2b. Communities Search
  const commSearchLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, avatar_url, members, stats')
      .eq('is_active', true)
      .or(`name.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
      .limit(8);
    const t1 = performance.now();
    commSearchLatencies.push(t1 - t0);
  }
  const commSearchMetrics = calcPercentiles(commSearchLatencies);
  console.log(`Communities Search: p50=${commSearchMetrics.p50}ms | p95=${commSearchMetrics.p95}ms`);

  // 2c. Posts Search
  const postSearchLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await supabase
      .from('social_posts')
      .select('id, user_id, content, media, data, stats, created_at')
      .eq('record_type', 'post')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .ilike('content', `%${queryTerm}%`)
      .order('created_at', { ascending: false })
      .limit(16);
    const t1 = performance.now();
    postSearchLatencies.push(t1 - t0);
  }
  const postSearchMetrics = calcPercentiles(postSearchLatencies);
  console.log(`Posts Search:       p50=${postSearchMetrics.p50}ms | p95=${postSearchMetrics.p95}ms`);

  // 2d. Combined Parallel Search Pipeline
  const combinedSearchLatencies: number[] = [];
  for (let i = 0; i < 25; i++) {
    const t0 = performance.now();
    const p1 = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, is_verified, profile_data')
      .eq('is_active', true)
      .or(`display_name.ilike.%${queryTerm}%,username.ilike.%${queryTerm}%`)
      .limit(8);
    const p2 = supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, avatar_url, members, stats')
      .eq('is_active', true)
      .or(`name.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
      .limit(8);
    const p3 = supabase
      .from('social_posts')
      .select('id, user_id, content, media, data, stats, created_at')
      .eq('record_type', 'post')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .ilike('content', `%${queryTerm}%`)
      .order('created_at', { ascending: false })
      .limit(16);

    const [{ data: u }, { data: c }, { data: p }] = await Promise.all([p1, p2, p3]);
    const t1 = performance.now();
    combinedSearchLatencies.push(t1 - t0);
    await new Promise((r) => setTimeout(r, 20));
  }
  const combinedSearchMetrics = calcPercentiles(combinedSearchLatencies);
  console.log(`Combined Search:    p50=${combinedSearchMetrics.p50}ms | p75=${combinedSearchMetrics.p75}ms | p95=${combinedSearchMetrics.p95}ms | p99=${combinedSearchMetrics.p99}ms | avg=${combinedSearchMetrics.avg}ms`);

  // ---------------------------------------------------------
  // 3. FEED API & FEEDERSENSE BREAKDOWN (30 Iterations)
  // ---------------------------------------------------------
  console.log('\n--- [3] FEED API & FEEDERSENSE PIPELINE BREAKDOWN (30 Iterations) ---');
  const feedTotalLatencies: number[] = [];
  const rankingLatencies: number[] = [];
  const serializationLatencies: number[] = [];

  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    const res = await FeederRecommendationEngine.getPersonalizedFeed({
      userId: 'guest',
      tab: 'FOR_YOU',
      limit: 10,
    });
    const t1 = performance.now();
    // measure serialization time to JSON
    const jsonStr = JSON.stringify({ success: true, posts: res.items, nextCursor: res.nextCursor, hasMore: res.hasMore });
    const t2 = performance.now();

    feedTotalLatencies.push(t2 - t0);
    rankingLatencies.push(t1 - t0);
    serializationLatencies.push(t2 - t1);
    await new Promise((r) => setTimeout(r, 20));
  }

  const feedMetrics = calcPercentiles(feedTotalLatencies);
  const rankMetrics = calcPercentiles(rankingLatencies);
  const serMetrics = calcPercentiles(serializationLatencies);

  console.log(`Feed API Total:    p50=${feedMetrics.p50}ms | p75=${feedMetrics.p75}ms | p95=${feedMetrics.p95}ms | p99=${feedMetrics.p99}ms | avg=${feedMetrics.avg}ms`);
  console.log(`FeederSense Rank:  p50=${rankMetrics.p50}ms | p75=${rankMetrics.p75}ms | p95=${rankMetrics.p95}ms | p99=${rankMetrics.p99}ms | avg=${rankMetrics.avg}ms`);
  console.log(`Serialization:     p50=${serMetrics.p50}ms | p95=${serMetrics.p95}ms | avg=${serMetrics.avg}ms`);

  // ---------------------------------------------------------
  // 4. SUMMARY AUDIT REPORT
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log('FINAL BENCHMARK MEASUREMENTS SUMMARY');
  console.log('================================================================');
  console.log(`Candidate Query:    p50 = ${candMetrics.p50}ms, p95 = ${candMetrics.p95}ms, p99 = ${candMetrics.p99}ms`);
  console.log(`Search API:         p50 = ${combinedSearchMetrics.p50}ms, p95 = ${combinedSearchMetrics.p95}ms, p99 = ${combinedSearchMetrics.p99}ms`);
  console.log(`Feed API Total:     p50 = ${feedMetrics.p50}ms, p95 = ${feedMetrics.p95}ms, p99 = ${feedMetrics.p99}ms`);
  console.log(`FeederSense Engine: p50 = ${rankMetrics.p50}ms, p95 = ${rankMetrics.p95}ms, p99 = ${rankMetrics.p99}ms`);
  console.log('================================================================\n');
}

runFinalVerification().catch(console.error);
