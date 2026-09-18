const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const viewports = [
  // Portrait Smartphone Matrix (320px -> 600px+)
  { name: '320x480_small', width: 320, height: 480 },
  { name: '320x568_se1', width: 320, height: 568 },
  { name: '320x640', width: 320, height: 640 },
  { name: '330x680_arbitrary', width: 330, height: 680 },
  { name: '340x700_arbitrary', width: 340, height: 700 },
  { name: '350x720_arbitrary', width: 350, height: 720 },
  { name: '360x640_galaxy', width: 360, height: 640 },
  { name: '360x720', width: 360, height: 720 },
  { name: '375x667_iphone_se', width: 375, height: 667 },
  { name: '375x812_iphone_x', width: 375, height: 812 },
  { name: '380x750_arbitrary', width: 380, height: 750 },
  { name: '390x700', width: 390, height: 700 },
  { name: '390x844_iphone_13', width: 390, height: 844 },
  { name: '393x852_iphone_14_pro', width: 393, height: 852 },
  { name: '400x800', width: 400, height: 800 },
  { name: '402x820_arbitrary', width: 402, height: 820 },
  { name: '410x850_arbitrary', width: 410, height: 850 },
  { name: '412x732_pixel', width: 412, height: 732 },
  { name: '412x915_pixel_7', width: 412, height: 915 },
  { name: '414x896_iphone_xr', width: 414, height: 896 },
  { name: '420x860_arbitrary', width: 420, height: 860 },
  { name: '430x800', width: 430, height: 800 },
  { name: '430x932_pro_max', width: 430, height: 932 },
  { name: '440x956_arbitrary', width: 440, height: 956 },
  { name: '480x800', width: 480, height: 800 },
  { name: '480x900', width: 480, height: 900 },
  { name: '500x920_arbitrary', width: 500, height: 920 },
  { name: '540x960_fold_outer', width: 540, height: 960 },
  { name: '560x980_arbitrary', width: 560, height: 980 },
  { name: '576x1000_arbitrary', width: 576, height: 1000 },
  { name: '600x1024_large_mobile', width: 600, height: 1024 },

  // Landscape Smartphone Tests
  { name: 'landscape_667x375', width: 667, height: 375 },
  { name: 'landscape_844x390', width: 844, height: 390 },
  { name: 'landscape_932x430', width: 932, height: 430 },

  // Tablet & Desktop Preserved
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'tablet_820x1180', width: 820, height: 1180 },
  { name: 'desktop_1440x900', width: 1440, height: 900 }
];

async function runAll() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let totalTests = viewports.length;
  let passedTests = 0;

  console.log(`Starting continuous fluid responsive tests across ${totalTests} viewports...\n`);

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    const hasHorizontalOverflow = scrollWidth > clientWidth;
    // For standard portrait phone heights (height >= 568), there should be 0 unwanted vertical scroll
    const isPortraitPhone = vp.width <= 600 && vp.height >= 568;
    const hasUnwantedVerticalScroll = isPortraitPhone && (scrollHeight > clientHeight);

    if (hasHorizontalOverflow) {
      console.error(`[FAIL - H-OVERFLOW] ${vp.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    } else if (hasUnwantedVerticalScroll) {
      console.error(`[FAIL - V-SCROLL] ${vp.name}: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`);
    } else {
      console.log(`[PASS] ${vp.name.padEnd(26)}: width ${clientWidth}/${scrollWidth} | height ${clientHeight}/${scrollHeight}`);
      passedTests++;
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n========================================`);
  console.log(`Summary: ${passedTests} / ${totalTests} viewports passed.`);
  console.log(`========================================`);
}

runAll().catch(console.error);
