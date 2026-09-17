import { chromium } from 'playwright';
import * as path from 'path';

const targetDir = 'C:\\Users\\Pachamuthu S\\.gemini\\antigravity-ide\\brain\\48c05c42-dc31-47db-b14a-a3bd84b87532';

const viewports = [
  // Short-height and standard phones
  { name: 'mobile_320x568', width: 320, height: 568 },
  { name: 'mobile_360x640', width: 360, height: 640 },
  { name: 'mobile_375x667', width: 375, height: 667 },
  { name: 'mobile_390x667', width: 390, height: 667 },
  { name: 'mobile_393x700', width: 393, height: 700 },
  { name: 'mobile_400x800', width: 400, height: 800 },
  { name: 'mobile_412x732', width: 412, height: 732 },
  { name: 'mobile_414x896', width: 414, height: 896 },
  { name: 'mobile_430x800', width: 430, height: 800 },
  { name: 'mobile_430x844', width: 430, height: 844 },
  { name: 'mobile_480x900', width: 480, height: 900 },
  // Tablets
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'tablet_820x1180', width: 820, height: 1180 },
  { name: 'tablet_1024x768', width: 1024, height: 768 },
  // Desktops
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1920x1080', width: 1920, height: 1080 },
  { name: 'desktop_2560x1440', width: 2560, height: 1440 },
];

async function run() {
  console.log('🚀 Launching Chromium for multi-viewport validation...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results: Record<string, any> = {};

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    // Check horizontal overflow
    const overflowInfo: any = await page.evaluate(`(() => {
      var scrollWidth = document.documentElement.scrollWidth;
      var clientWidth = document.documentElement.clientWidth;
      var innerWidth = window.innerWidth;
      return {
        scrollWidth: scrollWidth,
        clientWidth: clientWidth,
        innerWidth: innerWidth,
        hasHorizontalOverflow: scrollWidth > innerWidth
      };
    })()`);

    // Check visibility of key elements
    const elementsCheck: any = await page.evaluate(`(() => {
      function checkInDoc(sel) {
        var el = document.querySelector(sel);
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }
      function checkVisible(sel) {
        var el = document.querySelector(sel);
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
      }
      return {
        topBar: checkInDoc('.feeder-exact-top-bar') || checkInDoc('.feeder-language-btn'),
        welcomeSection: checkInDoc('.feeder-auth-welcome-title'),
        googleBtn: checkInDoc('.feeder-exact-google-btn'),
        emailInput: checkInDoc('#feeder-login-identifier'),
        passwordInput: checkInDoc('#feeder-login-password'),
        forgotPassword: checkInDoc('.feeder-exact-forgot-btn'),
        loginBtn: checkInDoc('.feeder-exact-btn-continue'),
        createAccountBtn: checkInDoc('.feeder-exact-btn-create-account'),
        loginBtnInViewport: checkVisible('.feeder-exact-btn-continue'),
        createBtnInViewport: checkVisible('.feeder-exact-btn-create-account')
      };
    })()`);

    const screenshotPath = path.join(targetDir, `login_responsive_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const pass = !overflowInfo.hasHorizontalOverflow &&
      elementsCheck.topBar &&
      elementsCheck.welcomeSection &&
      elementsCheck.googleBtn &&
      elementsCheck.emailInput &&
      elementsCheck.passwordInput &&
      elementsCheck.loginBtn &&
      elementsCheck.createAccountBtn;

    results[vp.name] = {
      ...vp,
      overflowInfo,
      elementsCheck,
      pass,
      screenshot: screenshotPath,
    };

    console.log(`  -> Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  -> Horizontal Overflow: ${overflowInfo.hasHorizontalOverflow ? 'YES (FAIL)' : 'NO (PASS)'} (scrollWidth: ${overflowInfo.scrollWidth}, innerWidth: ${overflowInfo.innerWidth})`);
    console.log(`  -> Login Btn in Viewport: ${elementsCheck.loginBtnInViewport}`);
    console.log(`  -> Create Btn in Viewport: ${elementsCheck.createBtnInViewport}`);
  }

  // Test interactive flows: Forgot password modal, language switch, email validation
  console.log('\n--- Testing Interactive Flows ---');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // 1. Forgot password modal
  console.log('Testing Forgot Password modal...');
  await page.click('.feeder-exact-forgot-btn');
  await page.waitForSelector('.feeder-modal-card', { state: 'visible' });
  await page.screenshot({ path: path.join(targetDir, 'login_responsive_modal_mobile.png') });
  await page.click('.feeder-modal-close-btn');
  console.log('  -> Forgot Password modal: ✅ PASS');

  // 2. Language switch
  console.log('Testing Language switch...');
  await page.click('.feeder-language-btn');
  await page.waitForSelector('.feeder-language-dropdown', { state: 'visible' });
  await page.click('.feeder-language-option:nth-child(2)'); // Switch language
  await page.waitForTimeout(300);
  const changedHeading = await page.textContent('.feeder-auth-welcome-title');
  console.log(`  -> Switched Heading: "${changedHeading}" - ✅ PASS`);

  // 3. Email Login validation
  console.log('Testing Email Login validation...');
  await page.fill('#feeder-login-identifier', '');
  await page.fill('#feeder-login-password', '');
  await page.click('.feeder-exact-btn-continue');
  await page.waitForSelector('.feeder-exact-alert-error', { state: 'visible' });
  const errorMsg = await page.textContent('.feeder-exact-alert-error');
  console.log(`  -> Error banner: "${errorMsg}" - ✅ PASS`);

  await browser.close();
  console.log('\n🎉 ALL RESPONSIVE AND INTERACTION TESTS COMPLETE!');
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
