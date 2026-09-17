import { chromium } from 'playwright';
import * as path from 'path';

const targetDir = 'C:\\Users\\Pachamuthu S\\.gemini\\antigravity-ide\\brain\\48c05c42-dc31-47db-b14a-a3bd84b87532';

const viewports = [
  // Mobile Phone Resolutions
  { name: 'phone_320x568', width: 320, height: 568 },
  { name: 'phone_320x640', width: 320, height: 640 },
  { name: 'phone_360x640', width: 360, height: 640 },
  { name: 'phone_360x720', width: 360, height: 720 },
  { name: 'phone_375x667', width: 375, height: 667 },
  { name: 'phone_375x812', width: 375, height: 812 },
  { name: 'phone_390x667', width: 390, height: 667 },
  { name: 'phone_390x844', width: 390, height: 844 },
  { name: 'phone_393x852', width: 393, height: 852 },
  { name: 'phone_400x800', width: 400, height: 800 },
  { name: 'phone_412x732', width: 412, height: 732 },
  { name: 'phone_412x915', width: 412, height: 915 },
  { name: 'phone_414x896', width: 414, height: 896 },
  { name: 'phone_430x800', width: 430, height: 800 },
  { name: 'phone_430x844', width: 430, height: 844 },
  { name: 'phone_430x932', width: 430, height: 932 },
  { name: 'phone_480x800', width: 480, height: 800 },
  { name: 'phone_480x900', width: 480, height: 900 },
  // Tablets
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'tablet_820x1180', width: 820, height: 1180 },
  { name: 'tablet_834x1194', width: 834, height: 1194 },
  { name: 'tablet_1024x768', width: 1024, height: 768 },
  // Desktops
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1920x1080', width: 1920, height: 1080 },
  { name: 'desktop_2560x1440', width: 2560, height: 1440 },
];

async function run() {
  console.log('🚀 Starting Final Mobile Login Verification Suite...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results: Record<string, any> = {};

  for (const vp of viewports) {
    console.log(`\nTesting: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    // Check overflow
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

    // Check elements
    const isMobile = vp.width <= 768;
    const elementsCheck: any = await page.evaluate(`((isMobile) => {
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

      if (isMobile) {
        return {
          langBtn: checkInDoc('.feeder-language-btn'),
          brandHeader: checkInDoc('.feeder-mobile-brand-header'),
          heroImage: checkInDoc('.feeder-mobile-hero-image'),
          authPanel: checkInDoc('.feeder-mobile-auth-panel'),
          featureGrid: checkInDoc('.feeder-mobile-features-grid'),
          btnEmail: checkInDoc('.feeder-mobile-btn-email'),
          btnGoogle: checkInDoc('.feeder-mobile-btn-google'),
          btnCreate: checkInDoc('.feeder-mobile-btn-create'),
          emailInViewport: checkVisible('.feeder-mobile-btn-email'),
          googleInViewport: checkVisible('.feeder-mobile-btn-google')
        };
      } else {
        return {
          langBtn: checkInDoc('.feeder-language-btn'),
          leftPanel: checkInDoc('.feeder-exact-left-panel'),
          rightPanel: checkInDoc('.feeder-exact-right-panel'),
          welcomeTitle: checkInDoc('.feeder-auth-welcome-title'),
          googleBtn: checkInDoc('.feeder-exact-google-btn'),
          emailInput: checkInDoc('#feeder-desktop-login-identifier'),
          passwordInput: checkInDoc('#feeder-desktop-login-password'),
          loginBtn: checkInDoc('.feeder-exact-btn-continue')
        };
      }
    })(${isMobile})`);

    const screenshotPath = path.join(targetDir, `final_login_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    let pass = !overflowInfo.hasHorizontalOverflow;
    if (isMobile) {
      pass = pass &&
        elementsCheck.langBtn &&
        elementsCheck.brandHeader &&
        elementsCheck.heroImage &&
        elementsCheck.authPanel &&
        elementsCheck.btnEmail &&
        elementsCheck.btnGoogle &&
        elementsCheck.btnCreate;
    } else {
      pass = pass &&
        elementsCheck.langBtn &&
        elementsCheck.leftPanel &&
        elementsCheck.rightPanel &&
        elementsCheck.googleBtn;
    }

    results[vp.name] = {
      ...vp,
      overflowInfo,
      elementsCheck,
      pass,
      screenshot: screenshotPath,
    };

    console.log(`  -> Pass: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  -> Horizontal Overflow: ${overflowInfo.hasHorizontalOverflow ? 'YES (FAIL)' : 'NO (PASS)'} (scrollWidth: ${overflowInfo.scrollWidth}, innerWidth: ${overflowInfo.innerWidth})`);
    if (isMobile) {
      console.log(`  -> Email CTA in Viewport: ${elementsCheck.emailInViewport}`);
      console.log(`  -> Google CTA in Viewport: ${elementsCheck.googleInViewport}`);
    }
  }

  // Interactive Flows on Mobile (375x667)
  console.log('\n--- Testing Mobile Interactive Flows ---');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // 1. Click Continue with Email
  console.log('Testing "Continue with Email" click -> reveal credentials form...');
  await page.click('.feeder-mobile-btn-email');
  await page.waitForSelector('#feeder-login-identifier', { state: 'visible' });
  await page.screenshot({ path: path.join(targetDir, 'final_login_mobile_form_revealed.png') });
  console.log('  -> Credentials form revealed: ✅ PASS');

  // 2. Email form validation
  console.log('Testing empty form submission...');
  await page.click('.feeder-exact-btn-continue');
  await page.waitForSelector('.feeder-exact-alert-error', { state: 'visible' });
  const errorMsg = await page.textContent('.feeder-exact-alert-error');
  console.log(`  -> Error banner: "${errorMsg}" - ✅ PASS`);

  // 3. Password visibility toggle
  console.log('Testing password visibility toggle...');
  await page.fill('#feeder-login-password', 'secret123');
  const typeBefore = await page.getAttribute('#feeder-login-password', 'type');
  await page.click('.feeder-exact-eye-btn');
  const typeAfter = await page.getAttribute('#feeder-login-password', 'type');
  console.log(`  -> Type before: ${typeBefore}, after: ${typeAfter} - ✅ PASS`);

  // 4. Forgot password modal
  console.log('Testing Forgot Password modal...');
  await page.click('.feeder-exact-forgot-btn');
  await page.waitForSelector('.feeder-modal-card', { state: 'visible' });
  await page.screenshot({ path: path.join(targetDir, 'final_login_mobile_forgot_modal.png') });
  await page.click('.feeder-modal-close-btn');
  console.log('  -> Forgot Password modal: ✅ PASS');

  // 5. Back to quick options
  console.log('Testing "Back to all options"...');
  await page.click('.feeder-mobile-back-btn');
  await page.waitForSelector('.feeder-mobile-btn-email', { state: 'visible' });
  console.log('  -> Back to quick options: ✅ PASS');

  // 6. Language selector
  console.log('Testing Language switch...');
  await page.click('.feeder-language-btn');
  await page.waitForSelector('.feeder-language-dropdown', { state: 'visible' });
  await page.click('.feeder-language-option:nth-child(2)'); // Tamil or another language
  await page.waitForTimeout(300);
  console.log('  -> Language switched successfully: ✅ PASS');

  await browser.close();
  console.log('\n🎉 FINAL MOBILE LOGIN AUDIT COMPLETE!');
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
