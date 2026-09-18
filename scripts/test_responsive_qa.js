const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const testViewports = [
  { name: 'phone_320x568', width: 320, height: 568 },
  { name: 'phone_360x640', width: 360, height: 640 },
  { name: 'phone_375x667', width: 375, height: 667 },
  { name: 'phone_390x667', width: 390, height: 667 },
  { name: 'phone_390x844', width: 390, height: 844 },
  { name: 'phone_393x852', width: 393, height: 852 },
  { name: 'phone_400x800', width: 400, height: 800 },
  { name: 'phone_412x732', width: 412, height: 732 },
  { name: 'phone_412x915', width: 412, height: 915 },
  { name: 'phone_414x896', width: 414, height: 896 },
  { name: 'phone_430x800', width: 430, height: 800 },
  { name: 'phone_430x932', width: 430, height: 932 },
  { name: 'phone_480x900', width: 480, height: 900 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'tablet_820x1180', width: 820, height: 1180 },
  { name: 'desktop_1440x900', width: 1440, height: 900 }
];

async function runComprehensiveQA() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let failures = 0;

  for (const vp of testViewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const screenshotPath = path.join(outDir, `qa_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    const hasHorizontalScroll = scrollWidth > clientWidth + 1;
    // Allow small margin on ultra-short 568px height
    const hasUnwantedVerticalScroll = vp.height >= 640 && scrollHeight > clientHeight + 10;

    if (hasHorizontalScroll || hasUnwantedVerticalScroll) {
      console.warn(`[WARNING] ${vp.name}: width=${clientWidth}/${scrollWidth}, height=${clientHeight}/${scrollHeight}`);
      failures++;
    } else {
      console.log(`[PASS] ${vp.name}: width=${clientWidth}, height=${clientHeight}/${scrollHeight}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nQA Finished with ${failures} warning(s).`);
}

runComprehensiveQA().catch(console.error);
