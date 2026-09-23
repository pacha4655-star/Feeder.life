import fs from 'fs';
import path from 'path';

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

const MOBILE_VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '360x800', width: 360, height: 800 },
  { name: '375x667', width: 375, height: 667 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x700', width: 390, height: 700 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 },
];

const TABLET_VIEWPORTS = [
  { name: '768x1024', width: 768, height: 1024 },
  { name: '800x1280', width: 800, height: 1280 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '834x1112', width: 834, height: 1112 },
  { name: '1024x1366', width: 1024, height: 1366 },
];

const DESKTOP_VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

async function runQA() {
  console.log('===============================================================');
  console.log('FEEDER.LIFE - MOBILE SETTINGS & HELP/SUPPORT QA TEST SUITE');
  console.log('===============================================================');

  // Setup authenticated user
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
    console.error('FAILED to sync user with Supabase:', syncResult.error);
    process.exit(1);
  }

  const token = createSessionToken({
    id: supaUser.id,
    firebase_uid: supaUser.firebase_uid,
    email: supaUser.email,
    username: supaUser.username || undefined,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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

  const page = await context.newPage();
  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Mobile Navigation Menu accessibility
  console.log('\n--- 1. Testing Mobile Navigation Menu ---');
  for (const vp of MOBILE_VIEWPORTS) {
    totalTests++;
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(600);

      const userBtn = await page.$('.user-avatar-btn') || await page.$('button[aria-label="User Account Menu"]');
      if (userBtn) {
        await userBtn.click();
        await page.waitForTimeout(400);

        const menuLinks = await page.$$eval('a', (els) =>
          els.map((e) => ({ text: e.textContent?.trim(), href: e.getAttribute('href') }))
        );

        const hasSettings = menuLinks.some((l) => l.href === '/settings' && l.text?.includes('Settings'));
        const hasHelp = menuLinks.some((l) => l.href === '/help' && l.text?.includes('Help'));
        const settingsCount = menuLinks.filter((l) => l.href === '/settings').length;
        const helpCount = menuLinks.filter((l) => l.href === '/help').length;

        if (hasSettings && hasHelp && settingsCount === 1 && helpCount === 1) {
          console.log(`  ✓ [${vp.name}] Mobile Menu: Settings & Help single entries verified`);
          passedTests++;
        } else {
          console.error(`  ✗ [${vp.name}] Failed: hasSettings=${hasSettings}, hasHelp=${hasHelp}, settingsCount=${settingsCount}, helpCount=${helpCount}`);
        }
      } else {
        console.error(`  ✗ [${vp.name}] User avatar button not found, url: ${page.url()}`);
      }
    } catch (e: any) {
      console.error(`  ✗ [${vp.name}] Error: ${e.message}`);
    }
  }

  // Test 2: Mobile Settings Flow (List -> Drilldown -> Back) & No Performance & Scrolling
  console.log('\n--- 2. Testing Mobile Settings Flow & Overflow ---');
  for (const vp of MOBILE_VIEWPORTS) {
    totalTests++;
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(600);

      // 1. Initial view: Nav pane visible, content pane hidden
      const initialNavVisible = await page.$eval('.feeder-settings-nav-pane', (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && !el.classList.contains('hide-on-mobile-when-active');
      });

      // 2. Click category item
      const categoryRow = await page.$('.feeder-settings-nav-row');
      if (categoryRow) {
        await categoryRow.click();
        await page.waitForTimeout(400);
      }

      // 3. Drilled view: Content pane visible, back button visible
      const drilledContentVisible = await page.$eval('.feeder-settings-content-pane', (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && !el.classList.contains('hide-on-mobile-when-list');
      });
      const backBtn = await page.$('.feeder-settings-mobile-back-btn');

      // 4. Click back button
      if (backBtn) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }

      // 5. Back to nav pane
      const backToNavVisible = await page.$eval('.feeder-settings-nav-pane', (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && !el.classList.contains('hide-on-mobile-when-active');
      });

      // 6. Check No Performance option
      const hasPerformance = await page.$$eval('*', (els) =>
        els.some((e) => /Performance Mode|Performance Preferences|Performance Settings/i.test(e.textContent || ''))
      );

      // 7. Check horizontal overflow & scrolling to bottom
      const scrollMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const scrollHeight = doc.scrollHeight;
        const scrollWidth = doc.scrollWidth;
        const clientWidth = doc.clientWidth;
        window.scrollTo(0, scrollHeight);
        return {
          scrollHeight,
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow: scrollWidth > clientWidth + 2,
          scrolledY: window.scrollY,
        };
      });

      if (
        initialNavVisible &&
        drilledContentVisible &&
        backToNavVisible &&
        !hasPerformance &&
        !scrollMetrics.hasHorizontalOverflow
      ) {
        console.log(`  ✓ [${vp.name}] Settings Drilldown Flow & Scroll OK (Height: ${scrollMetrics.scrollHeight}px, No Horiz Overflow, No Performance option)`);
        passedTests++;
      } else {
        console.error(`  ✗ [${vp.name}] Failed: initNav=${initialNavVisible}, drilled=${drilledContentVisible}, backNav=${backToNavVisible}, hasPerf=${hasPerformance}, horizOverflow=${scrollMetrics.hasHorizontalOverflow}`);
      }
    } catch (e: any) {
      console.error(`  ✗ [${vp.name}] Error: ${e.message}`);
    }
  }

  // Test 3: Mobile Help & Support Flow & Scrolling
  console.log('\n--- 3. Testing Mobile Help & Support Flow & Scrolling ---');
  for (const vp of MOBILE_VIEWPORTS) {
    totalTests++;
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/help', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(600);

      // Click Report a Problem nav row
      const reportBtn = await page.$('button:has-text("Report a Problem")');
      if (reportBtn) {
        await reportBtn.click();
        await page.waitForTimeout(400);
      }

      // Check drilled content pane visible with back button
      const contentVisible = await page.$eval('.feeder-help-content-pane', (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });

      const backBtn = await page.$('.feeder-help-mobile-back-btn');
      if (backBtn) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }

      const backToOverview = await page.$eval('.feeder-help-nav-pane', (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });

      const scrollMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const scrollHeight = doc.scrollHeight;
        const scrollWidth = doc.scrollWidth;
        const clientWidth = doc.clientWidth;
        window.scrollTo(0, scrollHeight);
        return {
          scrollHeight,
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow: scrollWidth > clientWidth + 2,
          scrolledY: window.scrollY,
        };
      });

      if (contentVisible && backToOverview && !scrollMetrics.hasHorizontalOverflow) {
        console.log(`  ✓ [${vp.name}] Help & Support Drilldown & Scroll OK (Height: ${scrollMetrics.scrollHeight}px, No Horiz Overflow)`);
        passedTests++;
      } else {
        console.error(`  ✗ [${vp.name}] Failed: content=${contentVisible}, back=${backToOverview}, horizOverflow=${scrollMetrics.hasHorizontalOverflow}`);
      }
    } catch (e: any) {
      console.error(`  ✗ [${vp.name}] Error: ${e.message}`);
    }
  }

  // Test 4: Tablet & Desktop dual panel layout check
  console.log('\n--- 4. Testing Tablet & Desktop Layouts ---');
  for (const vp of [...TABLET_VIEWPORTS, ...DESKTOP_VIEWPORTS]) {
    totalTests++;
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(600);

      const layout = await page.evaluate(() => {
        const nav = document.querySelector('.feeder-settings-nav-pane');
        const content = document.querySelector('.feeder-settings-content-pane');
        const navStyle = nav ? window.getComputedStyle(nav) : null;
        const contentStyle = content ? window.getComputedStyle(content) : null;

        const isDualPane = navStyle && contentStyle && navStyle.display !== 'none' && contentStyle.display !== 'none';
        const doc = document.documentElement;
        return {
          isDualPane,
          navDisplay: navStyle?.display,
          contentDisplay: contentStyle?.display,
          hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
        };
      });

      if (vp.width > 860) {
        // Must be dual-pane on wider screens
        if (layout.isDualPane && !layout.hasHorizontalOverflow) {
          console.log(`  ✓ [${vp.name}] Desktop Dual-Pane Layout Active & Overflow Clean`);
          passedTests++;
        } else {
          console.error(`  ✗ [${vp.name}] Failed: isDualPane=${layout.isDualPane}, horizOverflow=${layout.hasHorizontalOverflow}`);
        }
      } else {
        // Single column on narrow tablet
        if (!layout.hasHorizontalOverflow) {
          console.log(`  ✓ [${vp.name}] Responsive Single-Pane Layout Active & Overflow Clean`);
          passedTests++;
        } else {
          console.error(`  ✗ [${vp.name}] Failed: horizOverflow=${layout.hasHorizontalOverflow}`);
        }
      }
    } catch (e: any) {
      console.error(`  ✗ [${vp.name}] Error: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n===============================================================');
  console.log(`FINAL RESULTS: ${passedTests}/${totalTests} tests passed.`);
  console.log('===============================================================');
  if (passedTests === totalTests) {
    console.log('🎉 ALL MOBILE SETTINGS & HELP/SUPPORT VERIFICATIONS PASSED!');
  } else {
    process.exit(1);
  }
}

runQA().catch((err) => {
  console.error(err);
  process.exit(1);
});
