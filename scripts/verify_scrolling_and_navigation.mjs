import { chromium } from 'playwright';

const VIEWPORTS = [
  // Mobile
  { name: 'Mobile 360x640', width: 360, height: 640 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Mobile 412x915', width: 412, height: 915 },
  { name: 'Mobile 430x932', width: 430, height: 932 },
  // Tablet
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Tablet 820x1180', width: 820, height: 1180 },
  // Desktop
  { name: 'Desktop 1280x720', width: 1280, height: 720 },
  { name: 'Desktop 1440x900', width: 1440, height: 900 },
  { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
];

const PAGES_TO_TEST = [
  { path: '/help/report-problem', name: 'Report a Problem Form' },
  { path: '/help', name: 'Help Hub Overview' },
  { path: '/help/faq', name: 'Help FAQ' },
  { path: '/settings', name: 'Settings Hub' },
  { path: '/settings/personal', name: 'Settings Personal Info' },
  { path: '/settings/security', name: 'Settings Security' },
];

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;

  for (const pageTest of PAGES_TO_TEST) {
    console.log(`\n========================================`);
    console.log(`Testing: ${pageTest.name} (${pageTest.path})`);
    console.log(`========================================`);

    for (const vp of VIEWPORTS) {
      totalTests++;
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto(`http://localhost:3000${pageTest.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
          const clientHeight = doc.clientHeight;
          const clientWidth = doc.clientWidth;
          const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
          const hasHorizontalOverflow = scrollWidth > clientWidth + 2;

          // Try scrolling to bottom
          window.scrollTo(0, scrollHeight);
          const finalScrollY = window.scrollY;

          // Check if submit button or bottom content exists
          const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
          let submitVisible = false;
          if (submitBtn) {
            const rect = submitBtn.getBoundingClientRect();
            submitVisible = rect.bottom <= window.innerHeight + 100;
          }

          return {
            scrollHeight,
            clientHeight,
            scrollWidth,
            clientWidth,
            hasHorizontalOverflow,
            finalScrollY,
            submitVisible,
            isScrollable: scrollHeight > clientHeight,
          };
        });

        const canScrollProperly = !metrics.isScrollable || metrics.finalScrollY > 0;
        const noHoriz = !metrics.hasHorizontalOverflow;

        if (canScrollProperly && noHoriz) {
          console.log(`  ✓ [${vp.name}] Height: ${metrics.scrollHeight}px | Client: ${metrics.clientHeight}px | Scrolled: ${metrics.finalScrollY}px | Horiz Overflow: NO`);
          passedTests++;
        } else {
          console.error(`  ✗ [${vp.name}] Failed: isScrollable=${metrics.isScrollable}, finalScrollY=${metrics.finalScrollY}, horizOverflow=${metrics.hasHorizontalOverflow}`);
        }
      } catch (err) {
        console.error(`  ✗ [${vp.name}] Error: ${err.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(`\nAudit Complete: ${passedTests}/${totalTests} tests passed.`);
}

runAudit().catch(console.error);
