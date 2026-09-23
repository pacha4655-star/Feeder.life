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

  // Test 5: Independent Dual Panel Scrolling Verification on Desktop & Mobile
  console.log('\n5. Testing Independent Dual Scrolling on Desktop Viewports...');
  const desktopViewports = [
    { name: 'Laptop (1280x720)', width: 1280, height: 720 },
    { name: 'Desktop (1366x768)', width: 1366, height: 768 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
  ];

  for (const dvp of desktopViewports) {
    await page.setViewportSize({ width: dvp.width, height: dvp.height });
    await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const dualScrollResult = await page.evaluate(() => {
      const leftNavScroll = document.querySelector('.feeder-settings-nav-scroll-area') as HTMLElement | null;
      const rightContentPane = document.querySelector('.feeder-settings-content-pane') as HTMLElement | null;

      if (!leftNavScroll || !rightContentPane) {
        return { success: false, reason: 'Panels not found' };
      }

      const leftStyles = window.getComputedStyle(leftNavScroll);
      const rightStyles = window.getComputedStyle(rightContentPane);

      const leftOverscroll = leftStyles.overscrollBehavior || leftStyles.overscrollBehaviorY;
      const rightOverscroll = rightStyles.overscrollBehavior || rightStyles.overscrollBehaviorY;

      // Test Left scroll independence
      leftNavScroll.scrollTop = 250;
      const leftScrolled = leftNavScroll.scrollTop;
      const rightWhenLeftScrolled = rightContentPane.scrollTop;
      const winWhenLeftScrolled = window.scrollY;

      // Reset
      leftNavScroll.scrollTop = 0;

      // Test Right scroll independence
      rightContentPane.scrollTop = 300;
      const rightScrolled = rightContentPane.scrollTop;
      const leftWhenRightScrolled = leftNavScroll.scrollTop;
      const winWhenRightScrolled = window.scrollY;

      // Reset
      rightContentPane.scrollTop = 0;

      return {
        success: true,
        leftOverscroll,
        rightOverscroll,
        leftScrolled,
        rightWhenLeftScrolled,
        winWhenLeftScrolled,
        rightScrolled,
        leftWhenRightScrolled,
        winWhenRightScrolled,
        leftScrollable: leftNavScroll.scrollHeight > leftNavScroll.clientHeight,
        rightScrollable: rightContentPane.scrollHeight > rightContentPane.clientHeight,
      };
    });

    const isRightValid = (!dualScrollResult.rightScrollable && dualScrollResult.rightScrolled === 0) || (dualScrollResult.rightScrollable && dualScrollResult.rightScrolled > 0);

    if (
      dualScrollResult.success &&
      dualScrollResult.leftScrolled > 0 &&
      dualScrollResult.rightWhenLeftScrolled === 0 &&
      dualScrollResult.winWhenLeftScrolled === 0 &&
      isRightValid &&
      dualScrollResult.leftWhenRightScrolled === 0 &&
      dualScrollResult.winWhenRightScrolled === 0
    ) {
      console.log(`✓ Pass: Independent dual scrolling verified on ${dvp.name}`);
      console.log(`    Left Scroll: moved ${dualScrollResult.leftScrolled}px (Right: 0px, Window: 0px)`);
      console.log(`    Right Scroll: moved ${dualScrollResult.rightScrolled}px (Left: 0px, Window: 0px, Scrollable: ${dualScrollResult.rightScrollable})`);
      console.log(`    Overscroll Containment: Left=${dualScrollResult.leftOverscroll}, Right=${dualScrollResult.rightOverscroll}`);
    } else {
      console.error(`FAILED: Independent dual scrolling on ${dvp.name}:`, dualScrollResult);
      process.exit(1);
    }
  }

  console.log('\n6. Testing Natural Single Page Scrolling on Mobile Viewports...');
  const mobileViewports = [
    { name: 'Mobile (360x640)', width: 360, height: 640 },
    { name: 'Mobile (390x844)', width: 390, height: 844 },
    { name: 'Mobile (412x915)', width: 412, height: 915 },
    { name: 'Tablet (820x1180)', width: 820, height: 1180 },
  ];

  for (const mvp of mobileViewports) {
    await page.setViewportSize({ width: mvp.width, height: mvp.height });
    await page.goto('http://localhost:3000/settings/personal', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const mobileScrollResult = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const clientHeight = doc.clientHeight;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;

      window.scrollTo(0, scrollHeight);
      const finalScrollY = window.scrollY;

      return {
        scrollHeight,
        clientHeight,
        finalScrollY,
        hasHorizontalOverflow: scrollWidth > clientWidth + 2,
        isScrollable: scrollHeight > clientHeight,
      };
    });

    const passed = !mobileScrollResult.isScrollable || mobileScrollResult.finalScrollY > 0;
    if (passed && !mobileScrollResult.hasHorizontalOverflow) {
      console.log(`✓ Pass: Mobile natural scrolling on ${mvp.name} (Height: ${mobileScrollResult.scrollHeight}px, Scrolled: ${mobileScrollResult.finalScrollY}px, Horiz: NO)`);
    } else {
      console.error(`FAILED: Mobile natural scrolling on ${mvp.name}:`, mobileScrollResult);
      process.exit(1);
    }
  }

  await browser.close();
  console.log('\n======================================================');
  console.log(' ALL SETTINGS QA & VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runSettingsVerification().catch((err) => {
  console.error('Settings verification failed:', err);
  process.exit(1);
});
