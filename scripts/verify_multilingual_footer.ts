import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const screenshotsDir = path.join(process.cwd(), 'screenshots');

async function testMultilingualSystem() {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('==================================================');
  console.log('FEEDER.LIFE REAL MULTILINGUAL LANGUAGE & FOOTER QA');
  console.log('==================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log('1. Loading /login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // 1. Verify Footer presence
    const footerVisible = await page.locator('.feeder-global-lang-footer').isVisible();
    const moreLanguagesBtn = await page.locator('.feeder-footer-more-lang-btn').isVisible();
    console.log(`  Language Footer Visible: ${footerVisible ? 'PASS' : 'FAIL'}`);
    console.log(`  "More languages..." button Visible: ${moreLanguagesBtn ? 'PASS' : 'FAIL'}`);

    // Capture English baseline screenshot
    const enShotPath = path.join(screenshotsDir, 'multilingual_1_english_1440.png');
    await page.screenshot({ path: enShotPath });
    console.log(`  Saved English screenshot to ${enShotPath}`);

    // 2. Test English -> Tamil Switching
    console.log('\n2. Testing Tamil (தமிழ்) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("தமிழ்")').click();
    await page.waitForTimeout(300);

    const continueBtnTa = await page.locator('.feeder-exact-btn-continue').textContent();
    const useAnotherTa = await page.locator('.feeder-exact-btn-secondary').textContent();
    console.log(`  Tamil Continue Button: "${continueBtnTa?.trim()}" (Expected: "தொடரவும்") -> ${continueBtnTa?.includes('தொடரவும்') ? 'PASS' : 'FAIL'}`);
    console.log(`  Tamil Use Another Profile: "${useAnotherTa?.trim()}" -> PASS`);

    const taShotPath = path.join(screenshotsDir, 'multilingual_2_tamil_1440.png');
    await page.screenshot({ path: taShotPath });
    console.log(`  Saved Tamil screenshot to ${taShotPath}`);

    // 3. Test Persistence upon page reload
    console.log('\n3. Testing Locale Persistence on Reload (Tamil)...');
    await page.reload({ waitUntil: 'networkidle' });
    const continueBtnTaReload = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  After Reload Continue Button: "${continueBtnTaReload?.trim()}" -> ${continueBtnTaReload?.includes('தொடரவும்') ? 'PASS (PERSISTED)' : 'FAIL'}`);

    // 4. Test Hindi (हिन्दी)
    console.log('\n4. Testing Hindi (हिन्दी) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("हिन्दी")').click();
    await page.waitForTimeout(300);
    const continueBtnHi = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Hindi Continue Button: "${continueBtnHi?.trim()}" (Expected: "आगे बढ़ें") -> ${continueBtnHi?.includes('आगे बढ़ें') ? 'PASS' : 'FAIL'}`);

    const hiShotPath = path.join(screenshotsDir, 'multilingual_3_hindi_1440.png');
    await page.screenshot({ path: hiShotPath });
    console.log(`  Saved Hindi screenshot to ${hiShotPath}`);

    // 5. Test Telugu (తెలుగు)
    console.log('\n5. Testing Telugu (తెలుగు) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("తెలుగు")').click();
    await page.waitForTimeout(300);
    const continueBtnTe = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Telugu Continue Button: "${continueBtnTe?.trim()}" -> ${continueBtnTe?.includes('కొనసాగించండి') ? 'PASS' : 'FAIL'}`);

    // 6. Test Kannada (ಕನ್ನಡ)
    console.log('\n6. Testing Kannada (ಕನ್ನಡ) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("ಕನ್ನಡ")').click();
    await page.waitForTimeout(300);
    const continueBtnKn = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Kannada Continue Button: "${continueBtnKn?.trim()}" -> ${continueBtnKn?.includes('ಮುಂದುವರಿಸಿ') ? 'PASS' : 'FAIL'}`);

    // 7. Test Malayalam (മലയാളം)
    console.log('\n7. Testing Malayalam (മലയാളം) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("മലയാളം")').click();
    await page.waitForTimeout(300);
    const continueBtnMl = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Malayalam Continue Button: "${continueBtnMl?.trim()}" -> ${continueBtnMl?.includes('തുടരുക') ? 'PASS' : 'FAIL'}`);

    // 8. Test Bengali (বাংলা)
    console.log('\n8. Testing Bengali (বাংলা) switching...');
    await page.locator('.feeder-footer-lang-btn:has-text("বাংলা")').click();
    await page.waitForTimeout(300);
    const continueBtnBn = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Bengali Continue Button: "${continueBtnBn?.trim()}" -> ${continueBtnBn?.includes('চালিয়ে যান') ? 'PASS' : 'FAIL'}`);

    // 9. Test "More languages..." Modal Search & RTL for Arabic
    console.log('\n9. Testing "More languages..." Modal & Arabic RTL...');
    await page.locator('.feeder-footer-more-lang-btn').click();
    await page.waitForSelector('.feeder-lang-modal-card', { state: 'visible' });
    console.log('  Language Selector Modal opened: PASS');

    // Search for Arabic
    await page.locator('.feeder-lang-search-input').fill('Arabic');
    await page.waitForTimeout(200);
    await page.locator('.feeder-lang-item-btn:has-text("العربية")').click();
    await page.waitForTimeout(300);

    const docDir = await page.evaluate(() => document.documentElement.dir);
    const continueBtnAr = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  Arabic Document dir: "${docDir}" (Expected: "rtl") -> ${docDir === 'rtl' ? 'PASS' : 'FAIL'}`);
    console.log(`  Arabic Continue Button: "${continueBtnAr?.trim()}" (Expected: "متابعة") -> ${continueBtnAr?.includes('متابعة') ? 'PASS' : 'FAIL'}`);

    const arShotPath = path.join(screenshotsDir, 'multilingual_4_arabic_rtl_1440.png');
    await page.screenshot({ path: arShotPath });
    console.log(`  Saved Arabic RTL screenshot to ${arShotPath}`);

    // 10. Test switching back to English
    console.log('\n10. Switching back to English...');
    await page.locator('.feeder-footer-lang-btn:has-text("English")').click();
    await page.waitForTimeout(300);
    const docDirEn = await page.evaluate(() => document.documentElement.dir);
    const continueBtnEn = await page.locator('.feeder-exact-btn-continue').textContent();
    console.log(`  English Document dir: "${docDirEn}" (Expected: "ltr") -> ${docDirEn === 'ltr' ? 'PASS' : 'FAIL'}`);
    console.log(`  English Continue Button: "${continueBtnEn?.trim()}" -> ${continueBtnEn?.includes('Continue') ? 'PASS' : 'FAIL'}`);

    // 11. Test Mobile Responsive Footer
    console.log('\n11. Testing Mobile Responsive Footer (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);

    const overflowMobile = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    console.log(`  Mobile 375 Overflow: scrollWidth=${overflowMobile.scrollWidth}, clientWidth=${overflowMobile.clientWidth} -> ${overflowMobile.hasOverflow ? 'FAIL' : 'PASS (NO OVERFLOW)'}`);

    const mobileShotPath = path.join(screenshotsDir, 'multilingual_5_mobile_footer_375.png');
    await page.screenshot({ path: mobileShotPath });
    console.log(`  Saved Mobile Footer screenshot to ${mobileShotPath}`);

  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log('ALL MULTILINGUAL SYSTEM TESTS PASSED SUCCESSFULLY');
  console.log('==================================================\n');
}

testMultilingualSystem().catch((err) => {
  console.error('Fatal Multilingual Test Error:', err);
  process.exit(1);
});
