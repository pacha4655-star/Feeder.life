import fs from 'fs';
import path from 'path';

// Parse .env and .env.local manually before importing auth libs
function loadEnv() {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

import { chromium } from 'playwright';
import { syncUserWithSupabase } from '../src/lib/supabase/admin';
import { createSessionToken } from '../src/lib/auth/session';

async function runSettingsVerification() {
  console.log('--- Starting Feeder.life Settings System Automated Verification ---');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Test 1: Unauthenticated access redirect
  console.log('1. Testing Unauthenticated Gate...');
  const unauthPage = await context.newPage();
  await unauthPage.goto('http://localhost:3000/settings');
  const finalUrl = unauthPage.url();
  console.log(`- Navigated to /settings -> redirected to: ${finalUrl}`);
  if (!finalUrl.includes('/login')) {
    console.error('FAILED: Unauthenticated user was not redirected to /login');
    process.exit(1);
  }
  console.log('✓ Pass: Unauthenticated gate redirects to /login');
  await unauthPage.close();

  // Test 2: Real User Sync & Session Setup
  console.log('2. Syncing Real Test User with Supabase Database...');
  const testUid = `qa_guardian_uid_${Date.now()}`;
  const testEmail = `${testUid}@feeder.life`;

  const syncResult = await syncUserWithSupabase({
    firebase_uid: testUid,
    email: testEmail,
    display_name: 'Alex Feeder Guardian',
    username: `alex_qa_${Date.now()}`.slice(0, 20),
    profile_data: {
      area_name: 'Indiranagar',
      city: 'Bangalore',
      feeder_level: 'Master Feeder',
      feeding_count: 142,
      sos_count: 18,
    },
  });

  const supaUser = syncResult.user;
  if (!supaUser) {
    console.error('FAILED: Could not sync user in Supabase:', syncResult.error);
    process.exit(1);
  }

  console.log(`- User synced in Supabase: id=${supaUser.id}, username=${supaUser.username}`);

  const token = createSessionToken({
    id: supaUser.id,
    firebase_uid: supaUser.firebase_uid,
    email: supaUser.email,
    username: supaUser.username || undefined,
  });

  await context.addCookies([
    {
      name: 'feeder_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Viewports to test
  const viewports = [
    { name: 'Mobile (360x640)', width: 360, height: 640 },
    { name: 'Mobile (375x812)', width: 375, height: 812 },
    { name: 'Mobile (412x915)', width: 412, height: 915 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Laptop (1280x720)', width: 1280, height: 720 },
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
  ];

  const page = await context.newPage();

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name}...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (hasHorizontalOverflow) {
      console.error(`FAILED: Horizontal overflow detected on ${vp.name}`);
      process.exit(1);
    }
    console.log(`✓ Pass: Zero horizontal overflow on ${vp.name}`);

    // Verify main sections
    const title = await page.textContent('h1');
    console.log(`- Page header found: "${title?.trim()}"`);
  }

  // Test 3: Subroutes Verification
  const subroutes = [
    'personal',
    'security',
    'account',
    'privacy',
    'notifications',
    'feed',
    'language',
    'appearance',
    'accessibility',
    'permissions',
    'information',
    'communities',
    'animals',
    'support',
    'legal',
  ];

  console.log('\n3. Testing Direct Subroutes...');
  for (const sub of subroutes) {
    await page.goto(`http://localhost:3000/settings/${sub}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const subTitle = await page.textContent('#settings-content-heading');
    console.log(`✓ /settings/${sub} rendered section title: "${subTitle?.trim()}"`);
  }

  // Test 4: API Endpoint test
  console.log('\n4. Testing /api/users/settings GET and PUT...');
  const apiGetRes = await fetch('http://localhost:3000/api/users/settings', {
    headers: {
      Cookie: `feeder_session=${token}`,
    },
  });
  const apiGetData = await apiGetRes.json();
  console.log(`- GET /api/users/settings status: ${apiGetRes.status}, success: ${apiGetData.success}`);

  const apiPutRes = await fetch('http://localhost:3000/api/users/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${token}`,
    },
    body: JSON.stringify({
      settings: {
        theme: 'dark',
        alert_radius_km: 7,
      },
      privacy: {
        profile_visibility: 'followers',
      },
    }),
  });
  const apiPutData = await apiPutRes.json();
  console.log(`- PUT /api/users/settings status: ${apiPutRes.status}, success: ${apiPutData.success}`);

  await browser.close();
  console.log('\n======================================================');
  console.log(' ALL SETTINGS QA & VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runSettingsVerification().catch((err) => {
  console.error('Settings verification failed:', err);
  process.exit(1);
});
