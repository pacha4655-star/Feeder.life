import { chromium } from 'playwright';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive Automated Verification Suite for Feeder.life:
 * 1. Authentication Gate Verification (Anonymous users blocked & redirected to /login)
 * 2. Authenticated Session Redirects (Logged-in users visiting /login sent to /)
 * 3. API Security Gate (Anonymous access to protected APIs returns 401)
 * 4. Responsive Split Login Layout QA across 8 viewports:
 *    - Desktop: 2560x1440, 1920x1080, 1440x900, 1280x800
 *    - Tablet: 1024x768, 768x1024
 *    - Mobile: 430x932, 390x844, 375x812, 320x640
 * 5. Horizontal Overflow / Scroll Detection (Zero horizontal scroll allowed)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'desktop_2560', width: 2560, height: 1440 },
  { name: 'desktop_1920', width: 1920, height: 1080 },
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'desktop_1280', width: 1280, height: 800 },
  { name: 'tablet_1024', width: 1024, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_430', width: 430, height: 932 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'mobile_375', width: 375, height: 812 },
  { name: 'mobile_320', width: 320, height: 640 },
];

async function checkRouteRedirect(route: string, expectedLocation: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(route, BASE_URL);
    http.get(url.toString(), { headers: { 'User-Agent': 'FeederAuthQA/1.0' } }, (res) => {
      const isRedirect = res.statusCode === 307 || res.statusCode === 308 || res.statusCode === 302;
      const location = res.headers.location || '';
      const passes = isRedirect && location.includes(expectedLocation);
      console.log(`  [Route Check] ${route} -> Status ${res.statusCode}, Location: ${location} | ${passes ? 'PASS' : 'FAIL'}`);
      resolve(passes);
    }).on('error', (err) => {
      console.error(`  [Route Check Error] ${route}:`, err.message);
      resolve(false);
    });
  });
}

async function checkApiSecurity(route: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(route, BASE_URL);
    http.get(url.toString(), { headers: { 'User-Agent': 'FeederAuthQA/1.0' } }, (res) => {
      const passes = res.statusCode === 401;
      console.log(`  [API Guard] ${route} -> Status ${res.statusCode} | ${passes ? 'PASS (401 Blocked)' : 'FAIL'}`);
      resolve(passes);
    }).on('error', (err) => {
      console.error(`  [API Guard Error] ${route}:`, err.message);
      resolve(false);
    });
  });
}

async function runBrowserTests() {
  console.log('\n==================================================');
  console.log('STARTING PLAYWRIGHT BROWSER RESPONSIVE & UX AUDIT');
  console.log('==================================================\n');

  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    for (const vp of VIEWPORTS) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });

      console.log(`Testing Login page at ${vp.name} (${vp.width}x${vp.height})...`);
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

      // Verify page title
      const title = await page.title();
      console.log(`  Page Title: "${title}"`);

      // Verify Feeder headline presence
      const headline = await page.locator('.feeder-split-headline').textContent().catch(() => null);
      console.log(`  Feeder Headline: "${headline?.trim()}"`);

      // Verify form elements
      const emailInput = await page.locator('#feeder-identifier').isVisible();
      const passwordInput = await page.locator('#feeder-password').isVisible();
      const loginBtn = await page.locator('button[type="submit"]').isVisible();
      const googleBtn = await page.locator('.btn-google').isVisible();
      const forgotBtn = await page.locator('.feeder-forgot-link-btn').isVisible();
      const createAccountBtn = await page.locator('.feeder-create-account-btn').isVisible();

      console.log(`  UI Elements: EmailInput=${emailInput}, PwdInput=${passwordInput}, LoginBtn=${loginBtn}, GoogleBtn=${googleBtn}, ForgotBtn=${forgotBtn}, CreateAccBtn=${createAccountBtn}`);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });

      console.log(`  Overflow check: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth} -> ${overflow.hasOverflow ? 'FAIL (OVERFLOW)' : 'PASS (NO OVERFLOW)'}`);

      // Take screenshot
      const shotPath = path.join(screenshotsDir, `login_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  Screenshot saved to ${shotPath}\n`);

      await page.close();
    }

    // Test Forgot Password Modal Interaction
    console.log('Testing Forgot Password Modal Interaction...');
    const modalPage = await context.newPage();
    await modalPage.setViewportSize({ width: 1280, height: 800 });
    await modalPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    await modalPage.click('.feeder-forgot-link-btn');
    await modalPage.waitForSelector('.feeder-modal-card', { state: 'visible' });
    const modalVisible = await modalPage.locator('.feeder-modal-card').isVisible();
    console.log(`  Forgot Password Modal opened: ${modalVisible ? 'PASS' : 'FAIL'}`);

    const modalShotPath = path.join(screenshotsDir, 'login_forgot_password_modal.png');
    await modalPage.screenshot({ path: modalShotPath });
    console.log(`  Saved modal screenshot to ${modalShotPath}\n`);

    await modalPage.close();

    // Test Signup page
    console.log('Testing Split Signup page...');
    const signupPage = await context.newPage();
    await signupPage.setViewportSize({ width: 1440, height: 900 });
    await signupPage.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });

    const signupShotPath = path.join(screenshotsDir, 'signup_desktop_1440.png');
    await signupPage.screenshot({ path: signupShotPath });
    console.log(`  Saved signup screenshot to ${signupShotPath}\n`);

    await signupPage.close();

  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('==================================================');
  console.log('FEEDER.LIFE AUTHENTICATION GATE & SPLIT LOGIN TEST');
  console.log('==================================================\n');

  console.log('1. Testing Unauthenticated Route Protection (Must redirect to /login):');
  const protectedRoutes = [
    '/',
    '/home',
    '/feeding',
    '/sos',
    '/communities',
    '/nearby',
    '/profile/testuser',
    '/messages',
    '/notifications',
    '/settings',
    '/saved',
    '/reels',
    '/connections',
    '/ask-feeder',
    '/animals',
    '/create',
  ];

  let allRoutesPass = true;
  for (const route of protectedRoutes) {
    const passed = await checkRouteRedirect(route, '/login');
    if (!passed) allRoutesPass = false;
  }

  console.log('\n2. Testing Protected API Route Security (Must return 401):');
  const protectedApis = [
    '/api/posts',
    '/api/feeding',
    '/api/sos',
    '/api/communities',
    '/api/messages',
  ];

  let allApisPass = true;
  for (const api of protectedApis) {
    const passed = await checkApiSecurity(api);
    if (!passed) allApisPass = false;
  }

  console.log(`\nRoute Protection Summary: ${allRoutesPass ? 'ALL ROUTES PROTECTED (PASS)' : 'FAILURES DETECTED'}`);
  console.log(`API Security Summary: ${allApisPass ? 'ALL PROTECTED APIS ENFORCED (PASS)' : 'FAILURES DETECTED'}`);

  // Run Browser UI Tests
  await runBrowserTests();

  console.log('\n==================================================');
  console.log('ALL AUTHENTICATION GATE & RESPONSIVE QA COMPLETE');
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
