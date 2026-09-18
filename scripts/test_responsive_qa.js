const { chromium } = require('playwright');

const viewports = [
  // Mobile Phone Resolutions
  { name: 'phone_320x568', width: 320, height: 568 },
  { name: 'phone_360x640', width: 360, height: 640 },
  { name: 'phone_375x667', width: 375, height: 667 },
  { name: 'phone_375x812', width: 375, height: 812 },
  { name: 'phone_390x700', width: 390, height: 700 },
  { name: 'phone_390x844', width: 390, height: 844 },
  { name: 'phone_393x852', width: 393, height: 852 },
  { name: 'phone_400x800', width: 400, height: 800 },
  { name: 'phone_412x732', width: 412, height: 732 },
  { name: 'phone_412x915', width: 412, height: 915 },
  { name: 'phone_414x896', width: 414, height: 896 },
  { name: 'phone_430x932', width: 430, height: 932 },
  { name: 'phone_480x800', width: 480, height: 800 },
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

async function runTests() {
  console.log('--- Starting Comprehensive Multi-Resolution QA ---');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let allPass = true;

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    const checks = await page.evaluate((isMobile) => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const hasHorizontalOverflow = scrollWidth > innerWidth + 1;

      let visualElementsExist = false;
      let noBottomGap = true;
      if (isMobile) {
        const backdrop = document.querySelector('.feeder-mobile-backdrop-img');
        const emailHit = !!document.querySelector('.feeder-hitarea-email');
        const googleHit = !!document.querySelector('.feeder-hitarea-google');
        const appleHit = !!document.querySelector('.feeder-hitarea-apple');
        const createHit = !!document.querySelector('.feeder-hitarea-create');
        const loginHit = !!document.querySelector('.feeder-hitarea-login');
        const noDuplicateCard = !document.querySelector('.feeder-mobile-auth-panel');
        
        visualElementsExist = !!backdrop && emailHit && googleHit && appleHit && createHit && loginHit && noDuplicateCard;
        
        // Ensure the backdrop image is loaded and natural height ends cleanly
        if (backdrop) {
          const imgRect = backdrop.getBoundingClientRect();
          // Height of container should match image rendered height without extra spacer
          const container = document.querySelector('.feeder-mobile-nature-container');
          const containerRect = container ? container.getBoundingClientRect() : null;
          if (containerRect && Math.abs(containerRect.height - imgRect.height) > 10) {
            noBottomGap = false;
          }
        }
      } else {
        const desktopLeft = !!document.querySelector('.feeder-exact-left-panel');
        const desktopRight = !!document.querySelector('.feeder-exact-right-panel');
        visualElementsExist = desktopLeft && desktopRight;
      }

      return {
        hasHorizontalOverflow,
        scrollWidth,
        scrollHeight,
        innerHeight,
        visualElementsExist,
        noBottomGap
      };
    }, vp.width <= 768);

    const status = !checks.hasHorizontalOverflow && checks.visualElementsExist && checks.noBottomGap ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPass = false;

    console.log(`[${status}] ${vp.name} (${vp.width}x${vp.height}) - Scroll: ${checks.scrollWidth}/${checks.innerWidth}px, Elements: ${checks.visualElementsExist}`);
  }

  await browser.close();
  console.log('--- QA Test Result:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED', '---');
  if (!allPass) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
