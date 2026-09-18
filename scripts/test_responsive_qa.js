const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const devices = [
  { name: 'iphone_se_375x667', width: 375, height: 667 },
  { name: 'iphone_13_390x844', width: 390, height: 844 },
  { name: 'small_phone_320x568', width: 320, height: 568 },
  { name: 'pixel_7_412x915', width: 412, height: 915 },
  { name: 'iphone_14_pro_max_430x932', width: 430, height: 932 },
  { name: 'ipad_mini_768x1024', width: 768, height: 1024 },
  { name: 'desktop_1440x900', width: 1440, height: 900 }
];

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const d of devices) {
    const page = await browser.newPage({
      viewport: { width: d.width, height: d.height },
      deviceScaleFactor: 2
    });

    console.log(`Navigating to http://localhost:3000/login with ${d.name}...`);
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, `responsive_${d.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // Check for overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    console.log(`[${d.name}] Width: client=${clientWidth}, scroll=${scrollWidth} | Height: client=${clientHeight}, scroll=${scrollHeight}`);

    await page.close();
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

capture().catch(console.error);
