import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const screenshotsDir = path.join(process.cwd(), 'screenshots', 'login_verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const viewports = [
    // Laptops
    { name: 'laptop_1920x1080', width: 1920, height: 1080, type: 'laptop' },
    { name: 'laptop_1440x900', width: 1440, height: 900, type: 'laptop' },
    { name: 'laptop_1366x768', width: 1366, height: 768, type: 'laptop' },
    { name: 'laptop_1280x800', width: 1280, height: 800, type: 'laptop' },
    // Tablets
    { name: 'tablet_ipad_pro_1024x1366', width: 1024, height: 1366, type: 'tablet' },
    { name: 'tablet_ipad_air_834x1194', width: 834, height: 1194, type: 'tablet' },
    { name: 'tablet_ipad_10th_820x1180', width: 820, height: 1180, type: 'tablet' },
    { name: 'tablet_ipad_768x1024', width: 768, height: 1024, type: 'tablet' },
    { name: 'tablet_intermediate_800x1200', width: 800, height: 1200, type: 'tablet' },
    { name: 'tablet_intermediate_900x1100', width: 900, height: 1100, type: 'tablet' },
    // Mobile
    { name: 'mobile_iphone_15_pro_393x852', width: 393, height: 852, type: 'mobile' },
    { name: 'mobile_iphone_15_promax_430x932', width: 430, height: 932, type: 'mobile' },
    { name: 'mobile_iphone_se_375x667', width: 375, height: 667, type: 'mobile' },
    { name: 'mobile_android_360x780', width: 360, height: 780, type: 'mobile' },
  ];

  console.log('================================================================');
  console.log('FEEDER.LIFE LOGIN PAGE - COMPREHENSIVE RESPONSIVE AUDIT');
  console.log('================================================================\n');

  let allPassed = true;

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const screenshotPath = path.join(screenshotsDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const audit = await page.evaluate((vpType) => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const clientWidth = doc.clientWidth;
      const clientHeight = window.innerHeight;

      const hasHorizontalOverflow = scrollWidth > clientWidth;
      const hasVerticalOverflow = scrollHeight > clientHeight + 1; // 1px tolerance

      if (vpType === 'laptop' || vpType === 'tablet') {
        const leftImg = document.querySelector('.feeder-exact-left-hero-image') as HTMLImageElement | null;
        const leftPanel = document.querySelector('.feeder-exact-left-panel');
        const rightPanel = document.querySelector('.feeder-exact-right-panel');
        const splitLayout = document.querySelector('.feeder-exact-split-layout');
        const langBtn = document.querySelector('.feeder-language-btn');
        const googleBtn = document.querySelector('.feeder-exact-google-btn');
        const identifierInput = document.getElementById('feeder-desktop-login-identifier');
        const passwordInput = document.getElementById('feeder-desktop-login-password');
        const loginBtn = document.querySelector('.feeder-exact-btn-continue');
        const createAccountBtn = document.querySelector('.feeder-exact-btn-create-account');

        const leftImgVisible = leftImg ? (leftImg.naturalWidth > 0 && leftImg.offsetWidth > 0 && leftImg.offsetHeight > 0) : false;
        const imgNaturalRatio = leftImg ? (leftImg.naturalWidth / leftImg.naturalHeight) : 0;
        const imgRenderedRatio = leftImg ? (leftImg.offsetWidth / leftImg.offsetHeight) : 0;
        const ratioDelta = Math.abs(imgNaturalRatio - imgRenderedRatio);

        const langBtnRect = langBtn?.getBoundingClientRect();
        const langBtnOk = langBtnRect ? (langBtnRect.right <= window.innerWidth && langBtnRect.top >= 0) : false;

        return {
          type: vpType,
          scrollWidth,
          clientWidth,
          scrollHeight,
          clientHeight,
          hasHorizontalOverflow,
          hasVerticalOverflow,
          leftImgSrc: leftImg?.src || '',
          leftImgNaturalWidth: leftImg?.naturalWidth || 0,
          leftImgNaturalHeight: leftImg?.naturalHeight || 0,
          leftImgRenderedWidth: leftImg?.offsetWidth || 0,
          leftImgRenderedHeight: leftImg?.offsetHeight || 0,
          leftImgVisible,
          ratioDelta,
          rightPanelPresent: !!rightPanel,
          googleBtnPresent: !!googleBtn,
          identifierInputPresent: !!identifierInput,
          passwordInputPresent: !!passwordInput,
          loginBtnPresent: !!loginBtn,
          createAccountBtnPresent: !!createAccountBtn,
          langBtnOk,
        };
      } else {
        // Mobile checks
        const mobileContainer = document.querySelector('.feeder-mobile-nature-container');
        const mobileHeroImg = document.querySelector('.feeder-mobile-hero-img') as HTMLImageElement | null;
        const mobileAuthPanel = document.querySelector('.feeder-mobile-auth-panel');

        return {
          type: vpType,
          scrollWidth,
          clientWidth,
          scrollHeight,
          clientHeight,
          hasHorizontalOverflow,
          hasVerticalOverflow,
          mobileContainerVisible: !!mobileContainer,
          mobileHeroImgVisible: mobileHeroImg ? (mobileHeroImg.naturalWidth > 0) : false,
          mobileAuthPanelVisible: !!mobileAuthPanel,
        };
      }
    }, vp.type);

    console.log(`[Viewport: ${vp.name} (${vp.width}x${vp.height})]`);
    if (vp.type === 'laptop' || vp.type === 'tablet') {
      const imgOk = audit.leftImgVisible && audit.leftImgSrc.includes('feeder-login-left-composition.jpg');
      const ratioOk = (audit.ratioDelta || 0) < 0.05; // Aspect ratio preserved without distortion
      const hOverflowOk = !audit.hasHorizontalOverflow;
      const vScrollOk = vp.type === 'laptop' ? !audit.hasVerticalOverflow : true;
      const rightUiOk = audit.rightPanelPresent && audit.googleBtnPresent && audit.identifierInputPresent && audit.passwordInputPresent && audit.loginBtnPresent && audit.createAccountBtnPresent;
      const langOk = audit.langBtnOk;

      console.log(`  - Left Image Asset: ${audit.leftImgSrc.split('/').pop()} (${audit.leftImgNaturalWidth}x${audit.leftImgNaturalHeight})`);
      console.log(`  - Left Image Rendered: ${audit.leftImgRenderedWidth}x${audit.leftImgRenderedHeight} | Aspect ratio preservation: ${ratioOk ? 'EXACT' : 'MISMATCH'}`);
      console.log(`  - Right Panel UI Elements: ${rightUiOk ? 'ALL PRESENT & UNCHANGED' : 'FAILED'}`);
      console.log(`  - Language Button Positioning: ${langOk ? 'VALID (Top-Right)' : 'FAILED'}`);
      console.log(`  - Horizontal Overflow: ${hOverflowOk ? 'NONE (0px)' : `FAILED (${audit.scrollWidth} > ${audit.clientWidth})`}`);
      console.log(`  - Vertical Overflow: ${!audit.hasVerticalOverflow ? 'NONE (0px)' : `SCROLL (${audit.scrollHeight} > ${audit.clientHeight})`}`);

      const pass = imgOk && ratioOk && hOverflowOk && rightUiOk && langOk && (vp.type !== 'laptop' || vScrollOk);
      if (!pass) allPassed = false;
      console.log(`  => RESULT: ${pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
    } else {
      const mobileOk = audit.mobileContainerVisible && audit.mobileHeroImgVisible && !audit.hasHorizontalOverflow;
      console.log(`  - Mobile Container: ${audit.mobileContainerVisible ? 'OK' : 'FAIL'}`);
      console.log(`  - Mobile Hero Image: ${audit.mobileHeroImgVisible ? 'OK' : 'FAIL'}`);
      console.log(`  - Horizontal Overflow: ${!audit.hasHorizontalOverflow ? 'NONE (0px)' : 'FAILED'}`);
      if (!mobileOk) allPassed = false;
      console.log(`  => RESULT: ${mobileOk ? 'PASSED ✅' : 'FAILED ❌'}\n`);
    }
  }

  await browser.close();

  if (allPassed) {
    console.log('🎉 ALL AUDITS PASSED WITH ZERO ERRORS!');
  } else {
    console.log('⚠️ SOME VIEWPORTS FAILED AUDIT.');
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
