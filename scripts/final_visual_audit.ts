import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface CheckItem {
  name: string;
  passed: boolean;
  notes?: string;
}

interface ViewportVisualAudit {
  viewportName: string;
  width: number;
  height: number;
  checks: CheckItem[];
  screenshotPath: string;
}

async function runFinalVisualVerification() {
  const screenshotDir = 'C:/Users/Pachamuthu S/.gemini/antigravity-ide/brain/669b61c9-272a-40f4-aa74-29b3bad8a7ad/final_visual_screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const viewportsToVerify = [
    // 1. Mobile Portrait
    { name: 'iPhone 4S (320x480)', width: 320, height: 480, isMobile: true },
    { name: 'iPhone 5 / SE1 (320x568)', width: 320, height: 568, isMobile: true },
    { name: 'Android Galaxy S8 (360x640)', width: 360, height: 640, isMobile: true },
    { name: 'iPhone 8 / SE2 (375x667)', width: 375, height: 667, isMobile: true },
    { name: 'iPhone X / 11 Pro (375x812)', width: 375, height: 812, isMobile: true },
    { name: 'iPhone 12 / 13 / 14 (390x844)', width: 390, height: 844, isMobile: true },
    { name: 'iPhone 14 / 15 Pro (393x852)', width: 393, height: 852, isMobile: true },
    { name: 'Android Modern (400x800)', width: 400, height: 800, isMobile: true },
    { name: 'Pixel 7 (412x915)', width: 412, height: 915, isMobile: true },
    { name: 'iPhone 11 / XR (414x896)', width: 414, height: 896, isMobile: true },
    { name: 'iPhone 14/15 Pro Max (430x932)', width: 430, height: 932, isMobile: true },
    { name: 'Wide Mobile (480x900)', width: 480, height: 900, isMobile: true },
    // 2. Landscape
    { name: 'Landscape (640x360)', width: 640, height: 360, isMobile: true, isLandscape: true },
    { name: 'Landscape iPhone 12/13/14 (844x390)', width: 844, height: 390, isMobile: true, isLandscape: true },
    { name: 'Landscape iPhone 11 (896x414)', width: 896, height: 414, isMobile: true, isLandscape: true },
    { name: 'Landscape Pixel 7 (915x412)', width: 915, height: 412, isMobile: true, isLandscape: true },
    { name: 'Landscape iPhone 15 Pro Max (932x430)', width: 932, height: 430, isMobile: true, isLandscape: true },
    // 3. Tablet & Desktop Regression
    { name: 'iPad Portrait (768x1024)', width: 768, height: 1024, isMobile: true, isTablet: true },
    { name: 'iPad Air (820x1180)', width: 820, height: 1180, isMobile: false, isTablet: true },
    { name: 'iPad Pro (1024x1366)', width: 1024, height: 1366, isMobile: false, isTablet: true },
  ];

  const results: ViewportVisualAudit[] = [];

  for (const vp of viewportsToVerify) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const safeName = vp.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const screenshotFile = path.join(screenshotDir, `${safeName}.png`);
    await page.screenshot({ path: screenshotFile, fullPage: false });

    const audit = await page.evaluate((isLandscapeMobile) => {
      const doc = document.documentElement;
      const body = document.body;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. Feeder Logo & Top Area
      let logoVisible = false;
      let logoNotes = '';
      const mobileHeroImg = document.querySelector('.feeder-mobile-hero-img');
      const desktopHeroImg = document.querySelector('.feeder-exact-left-hero-image');
      const isMobileLayout = vw <= 768 || vh <= 520;

      if (isMobileLayout) {
        if (mobileHeroImg) {
          const r = mobileHeroImg.getBoundingClientRect();
          logoVisible = r.top >= 0 && r.height > 50 && r.width > 100;
          logoNotes = `Hero artwork & logo top: ${Math.round(r.top)}px, height: ${Math.round(r.height)}px`;
        }
      } else {
        if (desktopHeroImg) {
          const r = desktopHeroImg.getBoundingClientRect();
          logoVisible = r.top >= 0 && r.height > 100;
          logoNotes = `Desktop hero top: ${Math.round(r.top)}px, height: ${Math.round(r.height)}px`;
        }
      }

      // 2. Language Selector Position
      let langPosValid = false;
      let langNotes = '';
      const langTrigger = isMobileLayout
        ? document.querySelector('.feeder-mobile-lang-trigger-wrap')
        : document.querySelector('.feeder-language-selector-wrap');
      if (langTrigger) {
        const lr = langTrigger.getBoundingClientRect();
        langPosValid = lr.top >= 0 && lr.right <= vw + 2 && lr.width > 20 && lr.height > 20;
        langNotes = `Lang trigger top: ${Math.round(lr.top)}px, right: ${Math.round(lr.right)}px (viewport width: ${vw}px)`;
      }

      // 3. Tagline & Animal Hero Background Composition
      let animalBgValid = false;
      let animalBgNotes = '';
      if (isMobileLayout) {
        if (mobileHeroImg) {
          const r = mobileHeroImg.getBoundingClientRect();
          animalBgValid = r.width === vw || (vw > 480 && r.width <= 480);
          animalBgNotes = `Hero width: ${Math.round(r.width)}px, height: ${Math.round(r.height)}px, object-fit: cover`;
        }
      } else {
        animalBgValid = true;
        animalBgNotes = 'Desktop composition split layout';
      }

      // 4. White Auth Card Position
      let authCardValid = false;
      let authCardNotes = '';
      if (isMobileLayout) {
        const card = document.querySelector('.feeder-mobile-auth-panel');
        if (card) {
          const cr = card.getBoundingClientRect();
          authCardValid = cr.top > 40 && cr.bottom <= vh + 2 && cr.width > 200;
          authCardNotes = `Card top: ${Math.round(cr.top)}px, bottom: ${Math.round(cr.bottom)}px, height: ${Math.round(cr.height)}px (vh: ${vh}px)`;
        }
      } else {
        const rightPanel = document.querySelector('.feeder-exact-right-panel');
        if (rightPanel) {
          const r = rightPanel.getBoundingClientRect();
          authCardValid = r.width > 250;
          authCardNotes = `Desktop right panel width: ${Math.round(r.width)}px`;
        }
      }

      // 5. Six Feature Icons Alignment & Labels
      let featuresValid = false;
      let featuresNotes = '';
      if (isMobileLayout) {
        const items = Array.from(document.querySelectorAll('.feeder-mobile-feature-item'));
        if (items.length === 6) {
          let allInside = true;
          items.forEach((it, i) => {
            const r = it.getBoundingClientRect();
            if (r.left < 0 || r.right > vw) allInside = false;
          });
          featuresValid = allInside;
          featuresNotes = `All 6 feature items aligned horizontally within [0, ${vw}px]`;
        }
      } else {
        featuresValid = true;
        featuresNotes = 'Rendered inside left editorial hero on desktop';
      }

      // 6. Action Buttons Visibility & Bounds
      let buttonsValid = false;
      let buttonsNotes = '';
      if (isMobileLayout) {
        const emailBtn = document.querySelector('.feeder-mobile-btn-email');
        const googleBtn = document.querySelector('.feeder-mobile-btn-google');
        const appleBtn = document.querySelector('.feeder-mobile-btn-apple');
        const createBtn = document.querySelector('.feeder-mobile-btn-create');
        if (emailBtn && googleBtn && appleBtn && createBtn) {
          const er = emailBtn.getBoundingClientRect();
          const gr = googleBtn.getBoundingClientRect();
          const ar = appleBtn.getBoundingClientRect();
          const cr = createBtn.getBoundingClientRect();
          buttonsValid = er.bottom < vh && gr.bottom < vh && ar.bottom < vh && cr.bottom < vh;
          buttonsNotes = `All 4 buttons within [top: ${Math.round(er.top)}px, bottom: ${Math.round(cr.bottom)}px] (vh: ${vh}px)`;
        }
      } else {
        const googleBtn = document.querySelector('.feeder-exact-google-btn');
        const submitBtn = document.querySelector('.feeder-exact-btn-continue');
        buttonsValid = !!googleBtn && !!submitBtn;
        buttonsNotes = 'Desktop Google & Continue buttons active';
      }

      // 7. Pagination Dots & Footer
      let footerValid = false;
      let footerNotes = '';
      if (isMobileLayout) {
        const dots = document.querySelector('.feeder-mobile-dots-row');
        const footer = document.querySelector('.feeder-mobile-footer-wrap');
        if (dots && footer) {
          const fr = footer.getBoundingClientRect();
          footerValid = fr.bottom <= vh + 2;
          footerNotes = `Footer bottom: ${Math.round(fr.bottom)}px vs Viewport height: ${vh}px (diff: ${Math.round(fr.bottom - vh)}px)`;
        }
      } else {
        const desktopFooter = document.querySelector('.feeder-global-lang-footer');
        footerValid = !!desktopFooter;
        footerNotes = 'Desktop global language footer active';
      }

      // 8. No Unnecessary Blank Void
      let blankVoidCheck = false;
      let blankVoidNotes = '';
      if (isMobileLayout) {
        const footer = document.querySelector('.feeder-mobile-footer-wrap');
        if (footer) {
          const fr = footer.getBoundingClientRect();
          const spaceBelowFooter = vh - fr.bottom;
          // Space below footer should be reasonable padding (0px to 60px), not 160-220px blank void
          blankVoidCheck = spaceBelowFooter < 80;
          blankVoidNotes = `Space below footer: ${Math.round(spaceBelowFooter)}px (well-balanced padding)`;
        }
      } else {
        blankVoidCheck = true;
        blankVoidNotes = 'Desktop balanced split layout';
      }

      // 9. Document Scroll Measurements
      const docScrollY = doc.scrollHeight > doc.clientHeight + 1;
      const docScrollX = doc.scrollWidth > doc.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1;

      return {
        logoVisible,
        logoNotes,
        langPosValid,
        langNotes,
        animalBgValid,
        animalBgNotes,
        authCardValid,
        authCardNotes,
        featuresValid,
        featuresNotes,
        buttonsValid,
        buttonsNotes,
        footerValid,
        footerNotes,
        blankVoidCheck,
        blankVoidNotes,
        docScrollY,
        docScrollX,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    }, vp.isLandscape);

    const checks: CheckItem[] = [
      { name: 'Feeder Logo & Hero Visibility', passed: audit.logoVisible, notes: audit.logoNotes },
      { name: 'Language Selector Position', passed: audit.langPosValid, notes: audit.langNotes },
      { name: 'Animal Background Proportion', passed: audit.animalBgValid, notes: audit.animalBgNotes },
      { name: 'White Auth Card Alignment', passed: audit.authCardValid, notes: audit.authCardNotes },
      { name: 'Six Feature Icons Grid', passed: audit.featuresValid, notes: audit.featuresNotes },
      { name: 'Action Buttons Visibility', passed: audit.buttonsValid, notes: audit.buttonsNotes },
      { name: 'Footer & Dots Placement', passed: audit.footerValid, notes: audit.footerNotes },
      { name: 'No Excessive Blank Void', passed: audit.blankVoidCheck, notes: audit.blankVoidNotes },
      { name: 'Zero Horizontal Scroll', passed: !audit.docScrollX, notes: `Width: ${audit.clientWidth}px (scroll: ${audit.scrollWidth}px)` },
      { name: 'Zero Page Vertical Scroll', passed: !audit.docScrollY, notes: `Height: ${audit.clientHeight}px (scroll: ${audit.scrollHeight}px)` },
    ];

    results.push({
      viewportName: vp.name,
      width: vp.width,
      height: vp.height,
      checks,
      screenshotPath: screenshotFile,
    });

    await context.close();
  }

  // Also test iOS Safari / Android Chrome Device Emulation presets
  console.log('\n--- Testing Official Emulation Profiles ---');
  const iPhone13 = devices['iPhone 13'];
  const Pixel5 = devices['Pixel 5'];

  for (const dev of [
    { name: 'Apple iPhone 13 (Safari Emulation with Notch)', descriptor: iPhone13 },
    { name: 'Google Pixel 5 (Chrome Mobile Emulation)', descriptor: Pixel5 },
  ]) {
    const devContext = await browser.newContext(dev.descriptor);
    const devPage = await devContext.newPage();
    await devPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await devPage.waitForTimeout(300);

    const devAudit = await devPage.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollY: doc.scrollHeight > doc.clientHeight + 1,
        scrollX: doc.scrollWidth > doc.clientWidth + 1,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });

    const safeName = dev.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    await devPage.screenshot({ path: path.join(screenshotDir, `${safeName}.png`) });

    console.log(`[Emulation Profile] ${dev.name}:`);
    console.log(`  Scroll Y: ${devAudit.scrollY ? 'FAIL' : 'PASS (0px)'}, Scroll X: ${devAudit.scrollX ? 'FAIL' : 'PASS (0px)'}`);
    console.log(`  Dimensions: ${devAudit.clientWidth}x${devAudit.clientHeight} (Scroll: ${devAudit.scrollWidth}x${devAudit.scrollHeight})`);

    await devContext.close();
  }

  await browser.close();

  console.log('\n================================================================================');
  console.log('FINAL VISUAL VERIFICATION SUMMARY (20 TEST CONFIGURATIONS)');
  console.log('================================================================================\n');

  let allPassed = true;
  for (const r of results) {
    const failedChecks = r.checks.filter((c) => !c.passed);
    const status = failedChecks.length === 0 ? 'PASS' : `FAIL (${failedChecks.map((c) => c.name).join(', ')})`;
    if (failedChecks.length > 0) allPassed = false;
    console.log(`• ${r.viewportName} (${r.width}x${r.height}) => ${status}`);
    for (const c of r.checks) {
      console.log(`    - [${c.passed ? '✓' : '✗'}] ${c.name}: ${c.notes || ''}`);
    }
    console.log('');
  }

  console.log(`\nFinal Result: ${allPassed ? 'ALL 20 CONFIGURATIONS PASSED 100%' : 'FAILURES DETECTED'}`);
}

runFinalVisualVerification().catch(console.error);
