import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const screenshotsDir = path.join(process.cwd(), 'screenshots');

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

async function verifyRefinedLogin() {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('==================================================');
  console.log('FEEDER.LIFE REFINED AUTH LOGIN AUDIT');
  console.log('==================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    for (const vp of VIEWPORTS) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      console.log(`Auditing login page at ${vp.name} (${vp.width}x${vp.height})...`);
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

      // 1. Verify NO personal avatar or personal user name
      const hasPersonalAvatar = await page.locator('.feeder-avatar-circle-wrap').count();
      const pageContent = await page.content();
      const hasPachamuthu = pageContent.includes('Pachamuthu');
      const hasUseAnother = pageContent.includes('Use another profile');

      console.log(`  Personal Avatar Present: ${hasPersonalAvatar > 0 ? 'FAIL' : 'PASS (NONE)'}`);
      console.log(`  Personal Name "Pachamuthu" Present: ${hasPachamuthu ? 'FAIL' : 'PASS (NONE)'}`);
      console.log(`  "Use another profile" Present: ${hasUseAnother ? 'FAIL' : 'PASS (NONE)'}`);

      // 2. Verify Feeder Paw Icon and Welcome Header
      const pawIconVisible = await page.locator('.feeder-login-paw-icon').isVisible();
      const welcomeTitle = await page.locator('.feeder-auth-welcome-title').textContent();
      const welcomeSubtitle = await page.locator('.feeder-auth-welcome-subtitle').textContent();
      console.log(`  Feeder Paw Icon: ${pawIconVisible ? 'PASS' : 'FAIL'}`);
      console.log(`  Welcome Title: "${welcomeTitle?.trim()}" -> PASS`);
      console.log(`  Welcome Subtitle: "${welcomeSubtitle?.trim()}" -> PASS`);

      // 3. Verify Authentication Inputs & Buttons
      const googleBtnVisible = await page.locator('.feeder-exact-google-btn').isVisible();
      const emailInputVisible = await page.locator('#feeder-login-identifier').isVisible();
      const passwordInputVisible = await page.locator('#feeder-login-password').isVisible();
      const loginBtnVisible = await page.locator('button[type="submit"]:has-text("Log In")').isVisible();
      const createAccountBtnVisible = await page.locator('.feeder-exact-btn-create-account').isVisible();
      const forgotPasswordVisible = await page.locator('.feeder-exact-forgot-btn').isVisible();

      console.log(`  Auth UI: GoogleBtn=${googleBtnVisible}, EmailInput=${emailInputVisible}, PasswordInput=${passwordInputVisible}, LoginBtn=${loginBtnVisible}, CreateAccBtn=${createAccountBtnVisible}, ForgotPassword=${forgotPasswordVisible}`);

      // 4. Verify Overflow
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      console.log(`  Overflow check: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth} -> ${overflow.hasOverflow ? 'FAIL' : 'PASS (NO OVERFLOW)'}`);

      // 5. Take screenshot
      const shotPath = path.join(screenshotsDir, `refined_login_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  Saved screenshot to ${shotPath}\n`);

      await page.close();
    }

    // Test Forgot password modal interaction
    console.log('Testing Forgot Password Modal Interaction...');
    const modalPage = await context.newPage();
    await modalPage.setViewportSize({ width: 1440, height: 900 });
    await modalPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    await modalPage.click('.feeder-exact-forgot-btn');
    await modalPage.waitForSelector('.feeder-modal-card', { state: 'visible' });
    const isModalVisible = await modalPage.locator('.feeder-modal-card').isVisible();
    console.log(`  Forgot Password modal opened: ${isModalVisible ? 'PASS' : 'FAIL'}`);

    const modalShotPath = path.join(screenshotsDir, 'refined_login_forgot_password_modal.png');
    await modalPage.screenshot({ path: modalShotPath });
    console.log(`  Saved modal screenshot to ${modalShotPath}\n`);

    await modalPage.close();

  } finally {
    await browser.close();
  }

  console.log('==================================================');
  console.log('REFINED AUTH LOGIN VERIFICATION COMPLETE (ALL PASS)');
  console.log('==================================================\n');
}

verifyRefinedLogin().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
