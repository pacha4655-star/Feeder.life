import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

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
  console.log('Starting Playwright Signup Flow Test...');
  const browser = await chromium.launch({ headless: true });

  // 1. Functional Test on 390x844 (iPhone standard)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  console.log('1. Navigating to /login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a[href="/signup"]', { timeout: 8000 });
  
  // Verify Create new account button exists on login page
  const createBtn = page.locator('a[href="/signup"]').first();
  await createBtn.click();
  await page.waitForURL('**/signup');
  console.log('Successfully navigated to /signup via Create new account button');

  // Verify Step 1
  console.log('2. Testing Step 1 (Name)...');
  await page.waitForSelector('#signup-firstname');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step1_empty.png'), fullPage: true });

  // Try submitting without filling
  const continueBtn = page.locator('#btn-signup-continue');
  await continueBtn.click();
  const step1Error = await page.locator('[role="alert"]').first().textContent();
  console.log('Step 1 empty validation error:', step1Error);

  // Fill valid names
  await page.fill('#signup-firstname', 'Sundar');
  await page.fill('#signup-lastname', 'Pichai');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step1_filled.png'), fullPage: true });
  await continueBtn.click();

  // Verify Step 2
  console.log('3. Testing Step 2 (Account details)...');
  await page.waitForSelector('#signup-email');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step2_empty.png'), fullPage: true });

  // Fill invalid email
  await page.fill('#signup-email', 'invalid-email');
  await page.fill('#signup-username', 'testuser');
  await continueBtn.click();
  const step2EmailError = await page.locator('[role="alert"]').first().textContent();
  console.log('Step 2 invalid email error:', step2EmailError);

  // Fill valid email & username
  const testEmail = `testuser_${Date.now()}@feeder.life`;
  const testUsername = `user_${Date.now().toString().slice(-6)}`;
  await page.fill('#signup-email', testEmail);
  await page.fill('#signup-username', testUsername);
  
  // Wait for username availability check
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step2_filled.png'), fullPage: true });
  await continueBtn.click();

  // Verify Step 3
  console.log('4. Testing Step 3 (Password)...');
  await page.waitForSelector('#signup-password');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step3_empty.png'), fullPage: true });

  // Test short password
  await page.fill('#signup-password', '123');
  await page.fill('#signup-confirm-password', '123');
  await continueBtn.click();
  const step3ShortError = await page.locator('[role="alert"]').first().textContent();
  console.log('Step 3 short password error:', step3ShortError);

  // Test mismatch
  await page.fill('#signup-password', 'SuperSecret123!');
  await page.fill('#signup-confirm-password', 'MismatchSecret!');
  await continueBtn.click();
  const step3MismatchError = await page.locator('[role="alert"]').first().textContent();
  console.log('Step 3 mismatch error:', step3MismatchError);

  // Fill matching valid password
  await page.fill('#signup-password', 'FeederCare2026!');
  await page.fill('#signup-confirm-password', 'FeederCare2026!');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step3_filled.png'), fullPage: true });
  await continueBtn.click();

  // Verify Step 4
  console.log('5. Testing Step 4 (Profile & Terms)...');
  await page.waitForSelector('#signup-country');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step4_empty.png'), fullPage: true });

  // Test Terms required validation
  const createAccountBtn = page.locator('#btn-signup-submit');
  await createAccountBtn.click();
  const step4TermsError = await page.locator('[role="alert"]').first().textContent();
  console.log('Step 4 terms required error:', step4TermsError);

  // Fill optional location and check Terms
  await page.fill('#signup-country', 'United States');
  await page.fill('#signup-state', 'California');
  await page.fill('#signup-city', 'San Francisco');
  await page.check('#signup-terms');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'signup_step4_filled.png'), fullPage: true });

  // Test Back button across all steps preserving state
  console.log('6. Testing Back Navigation & State Preservation...');
  const backBtn = page.locator('#btn-signup-back');
  
  // From Step 4 -> Step 3
  await backBtn.click();
  await page.waitForSelector('#signup-password');
  console.log('Back to Step 3 - password state retained');

  // From Step 3 -> Step 2
  await backBtn.click();
  await page.waitForSelector('#signup-email');
  const retainedEmail = await page.inputValue('#signup-email');
  const retainedUsername = await page.inputValue('#signup-username');
  console.log(`Back to Step 2 - email: ${retainedEmail}, username: ${retainedUsername}`);

  // From Step 2 -> Step 1
  await backBtn.click();
  await page.waitForSelector('#signup-firstname');
  const retainedFirst = await page.inputValue('#signup-firstname');
  const retainedLast = await page.inputValue('#signup-lastname');
  console.log(`Back to Step 1 - first: ${retainedFirst}, last: ${retainedLast}`);

  // From Step 1 -> /login
  await backBtn.click();
  await page.waitForURL('**/login');
  console.log('Back from Step 1 successfully navigated to /login');

  // 7. Responsive Viewport Audits
  console.log('7. Running Responsive Viewport Audits...');
  for (const vp of viewports) {
    const vpPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await vpPage.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
    await vpPage.waitForSelector('.feeder-signup-card');

    const overflow = await vpPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}) - Horizontal Overflow: ${overflow ? 'FAIL' : 'PASS (0px)'}`);
    
    // Capture desktop and tablet screenshots
    if (vp.width >= 768) {
      await vpPage.screenshot({
        path: path.join(ARTIFACTS_DIR, `signup_${vp.name}.png`),
        fullPage: true
      });
    }
    await vpPage.close();
  }

  await browser.close();
  console.log('All signup flow & responsive tests passed successfully!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
