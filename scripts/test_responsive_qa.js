const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const testViewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '320x640', width: 320, height: 640 },
  { name: '360x640', width: 360, height: 640 },
  { name: '360x720', width: 360, height: 720 },
  { name: '375x667', width: 375, height: 667 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x667', width: 390, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '400x800', width: 400, height: 800 },
  { name: '412x732', width: 412, height: 732 },
  { name: '412x915', width: 412, height: 915 },
  { name: '414x896', width: 414, height: 896 },
  { name: '430x800', width: 430, height: 800 },
  { name: '430x932', width: 430, height: 932 },
  { name: '480x800', width: 480, height: 800 },
  { name: '480x900', width: 480, height: 900 },
  { name: '768x1024_tablet', width: 768, height: 1024 },
  { name: '820x1180_tablet', width: 820, height: 1180 },
  { name: '1440x900_desktop', width: 1440, height: 900 }
];

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let warnings = 0;

  for (const vp of testViewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    const hasHorizontalOverflow = scrollWidth > clientWidth;
    const hasVerticalOverflow = scrollHeight > clientHeight;

    if (hasHorizontalOverflow || hasVerticalOverflow) {
      console.log(`[SCROLL DETECTED] ${vp.name}: width ${clientWidth}/${scrollWidth} | height ${clientHeight}/${scrollHeight}`);
      warnings++;
    } else {
      console.log(`[ZERO SCROLL PASS] ${vp.name}: width ${clientWidth} | height ${clientHeight}/${scrollHeight}`);
    }

    if (['375x667', '390x844', '320x568', '430x932', '768x1024_tablet'].includes(vp.name)) {
      await page.screenshot({ path: path.join(outDir, `zero_scroll_${vp.name}.png`), fullPage: false });
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nCompleted with ${warnings} scroll issue(s).`);
}

runTest().catch(console.error);
