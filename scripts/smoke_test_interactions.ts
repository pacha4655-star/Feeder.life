import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../src/lib/supabase/server';

const VERCEL_URL = 'https://feeder-life.vercel.app';

function createSessionToken(user: { id: string; firebase_uid?: string; email?: string | null; username?: string }): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'feeder-life-session-secret-2026';
  const payload = {
    id: user.id,
    uid: user.firebase_uid,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

async function verifyMutations() {
  console.log('=================================================================');
  console.log('  LIVE PRODUCTION MUTATIONS & INTERACTION VERIFICATION');
  console.log(`  Target: ${VERCEL_URL}`);
  console.log('=================================================================\n');

  const supabase = getSupabaseServerClient();
  const { data: users } = await supabase.from('users').select('id, firebase_uid, email, username').limit(1);
  const { data: posts } = await supabase.from('social_posts').select('id').limit(1);

  if (!users || users.length === 0 || !posts || posts.length === 0) {
    throw new Error('User or post not found in Supabase for testing interactions');
  }

  const user = users[0];
  const post = posts[0];
  const token = createSessionToken(user);

  const authHeaders = {
    'User-Agent': 'FeederLifeSmokeTest/1.0',
    'Cookie': `feeder_session=${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // 1. Test Like Mutation
  console.log('[1/4] Testing Like / React Mutation...');
  const reactRes = await fetch(`${VERCEL_URL}/api/posts/${post.id}/react`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ type: 'heart' }),
  });
  const reactJson = await reactRes.json();
  console.log(`  Status: HTTP ${reactRes.status}`, reactJson);
  if (reactRes.status !== 200 || !reactJson.success) {
    throw new Error(`React mutation failed: ${JSON.stringify(reactJson)}`);
  }
  console.log('  ✅ [PASS] Like / React API mutation verified on live production deployment');

  // 2. Test Save Mutation
  console.log('\n[2/4] Testing Save / Bookmark Mutation...');
  const saveRes = await fetch(`${VERCEL_URL}/api/posts/${post.id}/save`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'save' }),
  });
  const saveJson = await saveRes.json();
  console.log(`  Status: HTTP ${saveRes.status}`, saveJson);
  if (saveRes.status !== 200 || !saveJson.success) {
    throw new Error(`Save mutation failed: ${JSON.stringify(saveJson)}`);
  }
  console.log('  ✅ [PASS] Save / Bookmark API mutation verified on live production deployment');

  // 3. Test Comment Addition & Retrieval
  console.log('\n[3/4] Testing Comment Mutation...');
  const commentRes = await fetch(`${VERCEL_URL}/api/posts/${post.id}/comments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ body: 'Production live smoke test comment: ' + new Date().toISOString() }),
  });
  const commentJson = await commentRes.json();
  console.log(`  Status: HTTP ${commentRes.status}`, commentJson);
  if (commentRes.status !== 200 || !commentJson.success) {
    throw new Error(`Comment mutation failed: ${JSON.stringify(commentJson)}`);
  }
  console.log('  ✅ [PASS] Comment creation verified on live production deployment');

  // 4. Test Comments Fetch
  console.log('\n[4/4] Testing Comments Fetch...');
  const getCommentsRes = await fetch(`${VERCEL_URL}/api/posts/${post.id}/comments`, {
    method: 'GET',
    headers: authHeaders,
  });
  const getCommentsJson = await getCommentsRes.json();
  console.log(`  Status: HTTP ${getCommentsRes.status}`, `Found ${getCommentsJson.comments?.length || 0} comments`);
  if (getCommentsRes.status !== 200 || !getCommentsJson.success) {
    throw new Error(`Comments fetch failed: ${JSON.stringify(getCommentsJson)}`);
  }
  console.log('  ✅ [PASS] Comments retrieval verified on live production deployment');

  console.log('\n=================================================================');
  console.log('  ALL LIVE INTERACTIVE MUTATION TESTS PASSED PERFECTLY');
  console.log('=================================================================');
}

verifyMutations().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
