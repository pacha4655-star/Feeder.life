import { JSDOM } from 'jsdom';

const VERCEL_URL = 'https://feeder-life.vercel.app';

async function verifyAssetsAndHtml() {
  console.log('=================================================================');
  console.log('  VERIFYING HTML ASSETS & CLIENT SCRIPTS ON PRODUCTION');
  console.log(`  Target: ${VERCEL_URL}`);
  console.log('=================================================================\n');

  const pagesToInspect = ['/login', '/signup'];
  let totalAssetsChecked = 0;
  let failedAssets = 0;

  for (const page of pagesToInspect) {
    console.log(`[+] Inspecting page: ${VERCEL_URL}${page}`);
    const res = await fetch(`${VERCEL_URL}${page}`, {
      headers: { 'User-Agent': 'AssetChecker/1.0' },
    });
    console.log(`    Status: HTTP ${res.status}`);
    const html = await res.text();

    // Extract script src, stylesheet href, image src
    const assetUrls: string[] = [];
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
    const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:stylesheet|preload)["']/g;
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;

    let match;
    while ((match = scriptRegex.exec(html)) !== null) assetUrls.push(match[1]);
    while ((match = linkRegex.exec(html)) !== null) assetUrls.push(match[1]);
    while ((match = imgRegex.exec(html)) !== null) assetUrls.push(match[1]);

    const uniqueAssets = Array.from(new Set(assetUrls));
    console.log(`    Found ${uniqueAssets.length} static assets referenced in HTML`);

    for (let asset of uniqueAssets) {
      if (asset.startsWith('data:') || asset.startsWith('blob:')) continue;
      asset = asset.replace(/&amp;/g, '&');
      const fullUrl = asset.startsWith('http') ? asset : `${VERCEL_URL}${asset.startsWith('/') ? '' : '/'}${asset}`;
      try {
        const assetRes = await fetch(fullUrl, { method: 'GET' });
        totalAssetsChecked++;
        if (assetRes.status >= 200 && assetRes.status < 400) {
          // OK
        } else {
          console.error(`    ❌ Broken asset: ${fullUrl} -> HTTP ${assetRes.status}`);
          failedAssets++;
        }
      } catch (err: any) {
        console.error(`    ❌ Asset fetch error: ${fullUrl} -> ${err.message}`);
        failedAssets++;
      }
    }
  }

  console.log('\n=================================================================');
  console.log(`  ASSET CHECK COMPLETE: ${totalAssetsChecked - failedAssets} / ${totalAssetsChecked} OK`);
  console.log('=================================================================');

  if (failedAssets > 0) {
    process.exit(1);
  }
}

verifyAssetsAndHtml().catch((e) => {
  console.error(e);
  process.exit(1);
});
