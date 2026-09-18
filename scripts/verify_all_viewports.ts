import { chromium } from 'playwright';

interface TestResult {
  viewport: string;
  dimensions: string;
  horizontalScroll: string;
  verticalLayoutIssue: string;
  clipping: string;
  overlap: string;
  result: 'PASS' | 'FAIL';
}

async function runComprehensiveVerification() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testViewports = [
    // Short phones
    { width: 320, height: 480, name: 'iPhone 4S / Short Phone' },
    { width: 320, height: 568, name: 'iPhone 5 / SE (1st gen)' },
    { width: 360, height: 640, name: 'Android Galaxy S8' },
    // Normal phones
    { width: 360, height: 720, name: 'Android Standard' },
    { width: 375, height: 667, name: 'iPhone 8 / SE (2nd gen)' },
    { width: 375, height: 812, name: 'iPhone X / 11 Pro' },
    { width: 390, height: 844, name: 'iPhone 12 / 13 / 14' },
    { width: 393, height: 852, name: 'iPhone 14 Pro / 15 Pro' },
    { width: 400, height: 800, name: 'Android Modern' },
    { width: 412, height: 915, name: 'Pixel 7' },
    { width: 414, height: 896, name: 'iPhone 11 / XR' },
    { width: 430, height: 932, name: 'iPhone 14/15 Pro Max' },
    { width: 480, height: 900, name: 'Wide Mobile' },
    { width: 540, height: 960, name: 'Foldable Outer' },
    { width: 600, height: 1024, name: 'Phablet / Tablet Mini' },
    // Intermediate Widths & Heights
    { width: 330, height: 700, name: 'Intermediate 330x700' },
    { width: 340, height: 740, name: 'Intermediate 340x740' },
    { width: 402, height: 820, name: 'Intermediate 402x820' },
    { width: 406, height: 860, name: 'Intermediate 406x860' },
    { width: 440, height: 880, name: 'Intermediate 440x880' },
    { width: 460, height: 900, name: 'Intermediate 460x900' },
    { width: 560, height: 900, name: 'Intermediate 560x900' },
    { width: 576, height: 900, name: 'Intermediate 576x900' },
    // Mobile Breakpoint Boundaries
    { width: 680, height: 800, name: 'Mobile Max (680x800)' },
    { width: 768, height: 800, name: 'Mobile Upper Boundary (768x800)' },
    // Landscape Phones
    { width: 640, height: 360, name: 'Landscape 640x360' },
    { width: 844, height: 390, name: 'Landscape 844x390 (iPhone 12/13/14)' },
    { width: 896, height: 414, name: 'Landscape 896x414 (iPhone 11)' },
    { width: 915, height: 412, name: 'Landscape 915x412 (Pixel 7)' },
    { width: 932, height: 430, name: 'Landscape 932x430 (iPhone 15 Pro Max)' },
    // Tablets & Desktop
    { width: 768, height: 1024, name: 'iPad Portrait (768x1024)' },
    { width: 820, height: 1180, name: 'iPad Air (820x1180)' },
    { width: 1024, height: 1366, name: 'iPad Pro (1024x1366)' },
    { width: 1280, height: 800, name: 'Desktop Standard (1280x800)' },
    { width: 1440, height: 900, name: 'Desktop Large (1440x900)' },
  ];

  const results: TestResult[] = [];

  for (const vp of testViewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const check = await page.evaluate((vpHeight) => {
      const doc = document.documentElement;
      const body = document.body;

      // 1. Horizontal scroll check
      const hasHorizontalScroll = doc.scrollWidth > doc.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1;

      // 2. Vertical layout / page scroll check
      const hasDocVerticalScroll = doc.scrollHeight > doc.clientHeight + 1;

      // 3. Clipping check on critical elements
      let hasClipping = false;
      let clippingDetails = 'None';

      const isMobile = window.innerWidth <= 768 || window.innerHeight <= 520;
      if (isMobile) {
        const heroImg = document.querySelector('.feeder-mobile-hero-img');
        const authPanel = document.querySelector('.feeder-mobile-auth-panel');
        const featureItems = document.querySelectorAll('.feeder-mobile-feature-item');
        const actionButtons = document.querySelectorAll('.feeder-mobile-btn-email, .feeder-mobile-btn-google, .feeder-mobile-btn-apple, .feeder-mobile-btn-create');
        const loginLink = document.querySelector('.feeder-mobile-login-link');
        const footer = document.querySelector('.feeder-mobile-footer-wrap');

        if (!heroImg || !authPanel || featureItems.length !== 6 || actionButtons.length !== 4 || !loginLink || !footer) {
          hasClipping = true;
          clippingDetails = 'Missing critical element';
        }

        // Check full-width action buttons bounding rects
        actionButtons.forEach((btn, idx) => {
          const r = btn.getBoundingClientRect();
          if (r.width < 100 || r.left < 0 || r.right > window.innerWidth) {
            hasClipping = true;
            clippingDetails = `Action Button ${idx} out of bounds (width: ${r.width}px, left: ${r.left}px, right: ${r.right}px)`;
          }
        });

        // Check inline login link
        if (loginLink) {
          const lr = loginLink.getBoundingClientRect();
          if (lr.left < 0 || lr.right > window.innerWidth) {
            hasClipping = true;
            clippingDetails = `Login link out of bounds`;
          }
        }
      } else {
        const desktopLeft = document.querySelector('.feeder-exact-left-panel');
        const desktopRight = document.querySelector('.feeder-exact-right-panel');
        const googleBtn = document.querySelector('.feeder-exact-google-btn');
        if (!desktopLeft || !desktopRight || !googleBtn) {
          hasClipping = true;
          clippingDetails = 'Desktop panel missing';
        }
      }

      // 4. Overlap check
      let hasOverlap = false;
      let overlapDetails = 'None';

      if (isMobile) {
        const featureItems = Array.from(document.querySelectorAll('.feeder-mobile-feature-item'));
        for (let i = 0; i < featureItems.length - 1; i++) {
          const r1 = featureItems[i].getBoundingClientRect();
          const r2 = featureItems[i + 1].getBoundingClientRect();
          if (r1.right > r2.left + 2) {
            hasOverlap = true;
            overlapDetails = `Features ${i} & ${i + 1} overlap`;
          }
        }
      }

      return {
        hasHorizontalScroll,
        hasDocVerticalScroll,
        docScrollHeight: doc.scrollHeight,
        docClientHeight: doc.clientHeight,
        hasClipping,
        clippingDetails,
        hasOverlap,
        overlapDetails,
      };
    }, vp.height);

    const isPass = !check.hasHorizontalScroll && !check.hasDocVerticalScroll && !check.hasClipping && !check.hasOverlap;

    results.push({
      viewport: vp.name,
      dimensions: `${vp.width}×${vp.height}`,
      horizontalScroll: check.hasHorizontalScroll ? 'FAIL (overflow)' : 'None (0px)',
      verticalLayoutIssue: check.hasDocVerticalScroll ? `FAIL (+${check.docScrollHeight - check.docClientHeight}px)` : 'None (0px)',
      clipping: check.hasClipping ? `FAIL (${check.clippingDetails})` : 'None',
      overlap: check.hasOverlap ? `FAIL (${check.overlapDetails})` : 'None',
      result: isPass ? 'PASS' : 'FAIL',
    });
  }

  await browser.close();

  console.log('\n====================================================================================================');
  console.log('FINAL RESPONSIVE VERIFICATION AUDIT TABLE');
  console.log('====================================================================================================\n');
  console.log('| Viewport | Dimensions | Horizontal Scroll | Vertical Layout Issue | Clipping | Overlap | Result |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.viewport} | ${r.dimensions} | ${r.horizontalScroll} | ${r.verticalLayoutIssue} | ${r.clipping} | ${r.overlap} | **${r.result}** |`);
  }

  const allPassed = results.every((r) => r.result === 'PASS');
  console.log(`\nOverall Verification: ${allPassed ? 'ALL TESTS PASSED (35/35)' : 'SOME TESTS FAILED'}`);
}

runComprehensiveVerification().catch(console.error);
