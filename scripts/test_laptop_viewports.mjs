/**
 * Feeder.life — Laptop Viewport Responsive Test Matrix
 * Tests all 12 required laptop viewports + intermediates.
 * Usage: node scripts/test_laptop_viewports.mjs
 */

import { chromium } from 'playwright';

const VIEWPORTS = [
  { w: 1366, h: 768,  label: '1366x768  (Short laptop)' },
  { w: 1366, h: 800,  label: '1366x800  (Mid laptop)' },
  { w: 1440, h: 768,  label: '1440x768  (Wide short)' },
  { w: 1440, h: 900,  label: '1440x900  (Standard)' },
  { w: 1536, h: 864,  label: '1536x864  (Surface)' },
  { w: 1600, h: 900,  label: '1600x900  (Standard)' },
  { w: 1680, h: 1050, label: '1680x1050 (Large)' },
  { w: 1920, h: 1080, label: '1920x1080 (Full HD)' },
  { w: 1920, h: 1200, label: '1920x1200 (Full HD+)' },
  { w: 2560, h: 1440, label: '2560x1440 (2K QHD)' },
  { w: 2880, h: 1800, label: '2880x1800 (MacBook Retina)' },
  { w: 3840, h: 2160, label: '3840x2160 (4K UHD)' },
  { w: 1280, h: 800,  label: '1280x800  (Intermediate)' },
  { w: 1400, h: 900,  label: '1400x900  (Intermediate)' },
  { w: 2048, h: 1152, label: '2048x1152 (Intermediate 2K)' },
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testViewport(page, { w, h, label }) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: 20000 });
  const results = [];

  const hOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  results.push({ check: 'No horizontal overflow', pass: !hOverflow });

  const vOverflow = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 2);
  results.push({ check: 'No vertical overflow', pass: !vOverflow });

  const imgInfo = await page.evaluate(() => {
    const img = document.querySelector('.feeder-exact-left-hero-image');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return { visible: rect.width > 0 && rect.height > 0, inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight + 2 && rect.right <= window.innerWidth + 2 };
  });
  results.push({ check: 'Hero image rendered', pass: imgInfo?.visible === true });
  results.push({ check: 'Hero image in viewport', pass: imgInfo?.inViewport === true });

  const rightPanelVisible = await page.evaluate(() => { const p = document.querySelector('.feeder-exact-right-panel'); if (!p) return false; const r = p.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  results.push({ check: 'Right panel visible', pass: rightPanelVisible });

  const inputsVisible = await page.evaluate(() => { const i = document.querySelector('#feeder-desktop-login-identifier'); if (!i) return false; const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom <= window.innerHeight + 2; });
  results.push({ check: 'Login inputs visible', pass: inputsVisible });

  const btnVisible = await page.evaluate(() => { const b = document.querySelector('.feeder-exact-btn-continue'); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 100 && r.height > 24 && r.bottom <= window.innerHeight + 2; });
  results.push({ check: 'Login button visible', pass: btnVisible });

  const noOverlap = await page.evaluate(() => { const l = document.querySelector('.feeder-exact-left-panel'); const r = document.querySelector('.feeder-exact-right-panel'); if (!l || !r) return false; return l.getBoundingClientRect().right <= r.getBoundingClientRect().left + 2; });
  results.push({ check: 'No panel overlap', pass: noOverlap });

  const failed = results.filter(r => !r.pass);
  return { label, w, h, passed: results.filter(r => r.pass).length, total: results.length, failed };
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
let totalPassed = 0, totalFailed = 0;

console.log('\n' + '='.repeat(70));
console.log('  Feeder.life — Laptop Viewport Responsive Test Matrix');
console.log('  Base URL: ' + BASE_URL);
console.log('='.repeat(70) + '\n');

const allResults = [];
for (const vp of VIEWPORTS) {
  try {
    const r = await testViewport(page, vp);
    allResults.push(r);
    const icon = r.failed.length === 0 ? 'PASS' : 'FAIL';
    console.log(icon + '  ' + r.label + '  (' + r.passed + '/' + r.total + ')');
    r.failed.forEach(f => console.log('     x FAIL: ' + f.check));
    totalPassed += r.passed;
    totalFailed += r.failed.length;
  } catch (err) {
    console.log('ERR  ' + vp.label + ' — ' + err.message);
    totalFailed++;
  }
}

await browser.close();

console.log('\n' + '='.repeat(70));
console.log('  SUMMARY');
console.log('  Viewports passed: ' + allResults.filter(r => r.failed?.length === 0).length + '/' + VIEWPORTS.length);
console.log('  Total checks: ' + (totalPassed + totalFailed) + '  Passed: ' + totalPassed + '  Failed: ' + totalFailed);
console.log('='.repeat(70) + '\n');
if (totalFailed > 0) process.exit(1);
