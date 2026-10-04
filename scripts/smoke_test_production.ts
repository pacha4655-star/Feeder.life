import crypto from 'node:crypto';
import { getSupabaseServerClient } from '../src/lib/supabase/server';

const VERCEL_URL = 'https://feeder-life.vercel.app';
const CUSTOM_DOMAIN_URL = 'https://feeder.life';

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

interface TestStep {
  name: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  authenticated?: boolean;
  expectedStatus: number | number[];
  checkContent?: (body: string) => boolean;
}

async function runLiveSmokeTest() {
  console.log('=================================================================');
  console.log('  FEEDER.LIFE — FULL PRODUCTION LIVE SMOKE TEST SUITE');
  console.log(`  Vercel Production Deployment: ${VERCEL_URL}`);
  console.log(`  Custom Production Domain:     ${CUSTOM_DOMAIN_URL}`);
  console.log('=================================================================\n');

  // Step 1: Fetch a real user from Supabase to create an authenticated session token
  console.log('[1/4] Preparing Authenticated Test Session...');
  const supabase = getSupabaseServerClient();
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, firebase_uid, email, username')
    .limit(1);

  if (userErr || !users || users.length === 0) {
    throw new Error(`Failed to retrieve test user from Supabase: ${userErr?.message}`);
  }

  const testUser = users[0];
  const sessionToken = createSessionToken(testUser);
  console.log(`  ✅ Session generated for user ID: ${testUser.id} (@${testUser.username || 'user'})\n`);

  // Step 2: Unauthenticated Security & Redirect Tests
  console.log('[2/4] Executing Public & Security Gate Verification...');
  const unauthTests: TestStep[] = [
    {
      name: 'Login Page (/login)',
      url: `${VERCEL_URL}/login`,
      expectedStatus: 200,
      checkContent: (b) => b.includes('feeder') || b.includes('Feeder') || b.includes('Sign In'),
    },
    {
      name: 'Signup Page (/signup)',
      url: `${VERCEL_URL}/signup`,
      expectedStatus: 200,
      checkContent: (b) => b.includes('feeder') || b.includes('Feeder') || b.includes('Sign Up'),
    },
    {
      name: 'Anonymous Access to Root (Redirect to /login)',
      url: `${VERCEL_URL}/`,
      expectedStatus: [307, 308],
    },
    {
      name: 'Anonymous Access to Protected Feed API (401 Unauthorized)',
      url: `${VERCEL_URL}/api/feed?tab=for-you`,
      expectedStatus: 401,
      checkContent: (b) => b.includes('Unauthorized'),
    },
    {
      name: 'Anonymous Access to Protected SOS API (401 Unauthorized)',
      url: `${VERCEL_URL}/api/sos`,
      expectedStatus: 401,
      checkContent: (b) => b.includes('Unauthorized'),
    },
    {
      name: 'Logout API (/api/auth/logout)',
      url: `${VERCEL_URL}/api/auth/logout`,
      method: 'POST',
      expectedStatus: [200, 307, 308],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of unauthTests) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, {
        method: t.method || 'GET',
        headers: {
          'User-Agent': 'FeederLifeSmokeTest/1.0',
          'Content-Type': 'application/json',
          ...(t.headers || {}),
        },
        body: t.body,
        redirect: 'manual',
      });
      const latency = Date.now() - start;
      const status = res.status;
      const bodyText = await res.text();
      const statusOk = Array.isArray(t.expectedStatus) ? t.expectedStatus.includes(status) : t.expectedStatus === status;
      const contentOk = t.checkContent ? t.checkContent(bodyText) : true;

      if (statusOk && contentOk) {
        console.log(`  ✅ [PASS] ${t.name} -> HTTP ${status} (${latency}ms)`);
        passed++;
      } else {
        console.error(`  ❌ [FAIL] ${t.name} -> HTTP ${status} (expected ${JSON.stringify(t.expectedStatus)})`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [ERROR] ${t.name} -> ${err.message}`);
      failed++;
    }
  }

  // Step 3: Authenticated Pages & APIs
  console.log('\n[3/4] Executing Authenticated Route & API Verification...');
  const authHeaders = {
    'User-Agent': 'FeederLifeSmokeTest/1.0',
    'Cookie': `feeder_session=${sessionToken}`,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  };
  const authApiHeaders = {
    'User-Agent': 'FeederLifeSmokeTest/1.0',
    'Cookie': `feeder_session=${sessionToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const authTests: TestStep[] = [
    {
      name: 'Authenticated Home / Feed Page (/)',
      url: `${VERCEL_URL}/`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('Feeder') || b.includes('feed'),
    },
    {
      name: 'Feed API (/api/feed?tab=for-you&limit=10)',
      url: `${VERCEL_URL}/api/feed?tab=for-you&limit=10`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true && Array.isArray(j.posts);
      },
    },
    {
      name: 'Feed Pagination API (/api/feed?page=2&limit=5)',
      url: `${VERCEL_URL}/api/feed?tab=for-you&page=2&limit=5`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true && Array.isArray(j.posts);
      },
    },
    {
      name: 'Communities Page (/communities)',
      url: `${VERCEL_URL}/communities`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('communit'),
    },
    {
      name: 'Communities API (/api/communities)',
      url: `${VERCEL_URL}/api/communities`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true || Array.isArray(j.data) || Array.isArray(j.communities);
      },
    },
    {
      name: 'Animals Page (/animals)',
      url: `${VERCEL_URL}/animals`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('animal'),
    },
    {
      name: 'Animals API (/api/animals)',
      url: `${VERCEL_URL}/api/animals`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true || Array.isArray(j.animals) || Array.isArray(j.data);
      },
    },
    {
      name: 'Adoption Page (/adoption)',
      url: `${VERCEL_URL}/adoption`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('adopt'),
    },
    {
      name: 'Feeding Page (/feeding)',
      url: `${VERCEL_URL}/feeding`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('feed'),
    },
    {
      name: 'SOS Page (/sos)',
      url: `${VERCEL_URL}/sos`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('sos') || b.includes('SOS'),
    },
    {
      name: 'SOS API (/api/sos)',
      url: `${VERCEL_URL}/api/sos`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true || Array.isArray(j.data) || Array.isArray(j.alerts);
      },
    },
    {
      name: 'Lost & Found Page (/lost-found)',
      url: `${VERCEL_URL}/lost-found`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('lost') || b.includes('found'),
    },
    {
      name: 'Impact API (/api/impact)',
      url: `${VERCEL_URL}/api/impact`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true;
      },
    },
    {
      name: 'User Profile Page (/profile)',
      url: `${VERCEL_URL}/profile`,
      headers: authHeaders,
      expectedStatus: [200, 307, 308],
      checkContent: (b) => b.includes('__next') || b.includes('profile') || b.includes('user') || b.includes('Redirecting'),
    },
    {
      name: 'Messages Page (/messages)',
      url: `${VERCEL_URL}/messages`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('message'),
    },
    {
      name: 'Notifications Page (/notifications)',
      url: `${VERCEL_URL}/notifications`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('notification'),
    },
    {
      name: 'Connections Page (/connections)',
      url: `${VERCEL_URL}/connections`,
      headers: authHeaders,
      expectedStatus: 200,
      checkContent: (b) => b.includes('__next') || b.includes('connection'),
    },
    {
      name: 'Global Search API (/api/search?q=india&type=all)',
      url: `${VERCEL_URL}/api/search?q=india&type=all`,
      headers: authApiHeaders,
      expectedStatus: 200,
      checkContent: (b) => {
        const j = JSON.parse(b);
        return j.success === true;
      },
    },
    {
      name: '404 Page (/_not-found)',
      url: `${VERCEL_URL}/non-existent-route-verification-smoke-404`,
      headers: authHeaders,
      expectedStatus: [404, 200],
      checkContent: (b) => b.includes('__next') || b.includes('404') || b.includes('not found') || b.includes('Not Found'),
    },
  ];

  for (const t of authTests) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, {
        method: t.method || 'GET',
        headers: t.headers,
        body: t.body,
        redirect: 'follow',
      });
      const latency = Date.now() - start;
      const status = res.status;
      const bodyText = await res.text();
      const statusOk = Array.isArray(t.expectedStatus) ? t.expectedStatus.includes(status) : t.expectedStatus === status;
      let contentOk = true;
      if (t.checkContent) {
        try {
          contentOk = t.checkContent(bodyText);
        } catch {
          contentOk = false;
        }
      }

      if (statusOk && contentOk) {
        console.log(`  ✅ [PASS] ${t.name} -> HTTP ${status} (${latency}ms)`);
        passed++;
      } else {
        console.error(`  ❌ [FAIL] ${t.name} -> HTTP ${status} (expected ${JSON.stringify(t.expectedStatus)}) [Content Check: ${contentOk ? 'PASS' : 'FAIL'}]`);
        console.error(`     Snippet: ${bodyText.slice(0, 200)}...`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [ERROR] ${t.name} -> ${err.message}`);
      failed++;
    }
  }

  // Step 4: Custom Domain Status Check
  console.log('\n[4/4] Verifying Custom Domain DNS / Nameservers...');
  try {
    const customRes = await fetch(CUSTOM_DOMAIN_URL, { redirect: 'manual' });
    const serverHeader = customRes.headers.get('server') || 'Unknown';
    console.log(`  ℹ️ Custom Domain: ${CUSTOM_DOMAIN_URL} -> HTTP ${customRes.status} (Server: ${serverHeader})`);
    if (serverHeader.includes('DPS') || serverHeader.includes('godaddy')) {
      console.log('  ⚠️ Note on Domain DNS: feeder.life is currently resolving to GoDaddy DPS DNS records instead of Vercel.');
      console.log('     To route feeder.life directly to this Vercel deployment:');
      console.log('     Add A Record: 76.76.21.21 or CNAME: cname.vercel-dns.com in GoDaddy DNS settings.');
    } else {
      console.log('  ✅ Custom domain is pointed to production hosting server.');
    }
  } catch (err: any) {
    console.log(`  ⚠️ Custom domain check note: ${err.message}`);
  }

  const total = unauthTests.length + authTests.length;
  console.log('\n=================================================================');
  console.log(`  PRODUCTION LIVE SMOKE TEST RESULT: ${passed} / ${total} PASSED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveSmokeTest();
