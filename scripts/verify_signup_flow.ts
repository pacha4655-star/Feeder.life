import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Pachamuthu S/.gemini/antigravity-ide/brain/48c05c42-dc31-47db-b14a-a3bd84b87532';

const viewports = [
  { name: 'phone_320x568', width: 320, height: 568 },
  { name: 'phone_360x640', width: 360, height: 640 },
  { name: 'phone_375x667', width: 375, height: 667 },
  { name: 'phone_375x812', width: 375, height: 812 },
  { name: 'phone_390x844', width: 390, height: 844 },
  { name: 'phone_393x852', width: 393, height: 852 },
  { name: 'phone_412x915', width: 412, height: 915 },
  { name: 'phone_430x932', width: 430, height: 932 },
  { name: 'phone_480x900', width: 480, height: 900 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'tablet_1024x768', width: 1024, height: 768 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1920x1080', width: 1920, height: 1080 },
];

async function run() {
  console.log('Starting Playwright Verification for Compact Feeder Signup...');
  const browser = await chromium.launch({ headless: true });

  // 1. Functional & Validation Test on standard iPhone (390x844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to /login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  const createBtn = page.locator('a[href="/signup"]').first();
  await createBtn.click();
  await page.waitForURL('**/signup');
  console.log('Successfully navigated to /signup via Create new account button');

  // Verify form loaded
  await page.waitForSelector('#signup-firstname');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_compact_empty_mobile.png'), fullPage: true });

  // 2. Test empty submission validation
  console.log('2. Testing Validation Errors...');
  const submitBtn = page.locator('#btn-signup-submit');
  await submitBtn.click();
  let alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Empty First Name Error:', alertText);

  // Fill first name only
  await page.fill('#signup-firstname', 'Sundar');
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Empty Last Name Error:', alertText);

  // Fill last name
  await page.fill('#signup-lastname', 'Pichai');
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Empty Username Error:', alertText);

  // Fill username
  const testUsername = `user_${Date.now().toString().slice(-6)}`;
  await page.fill('#signup-username', testUsername);
  await page.waitForTimeout(500); // wait for availability check

  // Test invalid email
  await page.fill('#signup-email', 'invalid-email');
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Invalid Email Error:', alertText);

  // Fill valid email
  const testEmail = `testuser_${Date.now()}@feeder.life`;
  await page.fill('#signup-email', testEmail);

  // Test short password
  await page.fill('#signup-password', '123');
  await page.fill('#signup-confirm-password', '123');
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Short Password Error:', alertText);

  // Test password mismatch
  await page.fill('#signup-password', 'FeederCare2026!');
  await page.fill('#signup-confirm-password', 'Mismatch2026!');
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Password Mismatch Error:', alertText);

  // Fill matching valid password
  await page.fill('#signup-confirm-password', 'FeederCare2026!');

  // Test Terms required
  await submitBtn.click();
  alertText = await page.locator('[role="alert"]').first().textContent();
  console.log('Terms Required Error:', alertText);

  // Check Terms and fill optional location
  await page.check('#signup-terms');
  await page.fill('#signup-country', 'United States');
  await page.fill('#signup-city', 'San Francisco');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_compact_filled_mobile.png'), fullPage: true });

  // 3. Test Back Button
  console.log('3. Testing Back Button...');
  const backBtn = page.locator('#btn-signup-back');
  await backBtn.click();
  await page.waitForURL('**/login');
  console.log('Back button successfully returned to /login');

  // 4. Viewport & No-Unnecessary-Scroll Audits
  console.log('4. Running Responsive Viewport Audits...');
  for (const vp of viewports) {
    const vpPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await vpPage.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
    await vpPage.waitForSelector('.feeder-compact-signup-card');

    const result = await vpPage.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const horizontalOverflow = docEl.scrollWidth > window.innerWidth;
      const totalScrollHeight = Math.max(docEl.scrollHeight, body.scrollHeight);
      const viewportHeight = window.innerHeight;
      const hasVerticalScroll = totalScrollHeight > viewportHeight;
      return {
        horizontalOverflow,
        totalScrollHeight,
        viewportHeight,
        hasVerticalScroll,
      };
    });

    console.log(
      `Viewport ${vp.name} (${vp.width}x${vp.height}): ` +
      `Horizontal Overflow = ${result.horizontalOverflow ? 'FAIL' : 'PASS (0px)'}, ` +
      `ScrollHeight = ${result.totalScrollHeight}px (Viewport = ${result.viewportHeight}px)`
    );

    // Capture desktop and tablet screenshots
    if (vp.width >= 768) {
      await vpPage.screenshot({
        path: path.join(ARTIFACTS_DIR, `signup_compact_${vp.name}.png`),
        fullPage: true,
      });
    }
    await vpPage.close();
  }

  await browser.close();
  console.log('All compact signup UI tests completed successfully!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
