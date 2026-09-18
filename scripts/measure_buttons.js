const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function measure() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const imgPath = path.resolve('public/images/feeder-mobile-login-bg.jpg');
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');

  await page.setContent('<html><body style="margin:0"><canvas id="c"></canvas></body></html>');

  const coords = await page.evaluate((b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('c');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Scan along x = 341 from y = 550 to 950
        const H = canvas.height;
        const W = canvas.width;

        // Button horizontal bounds are approximately from x = 88 to x = 594 (width = 506, left = 12.9%, width = 74.2%)
        // Let's find vertical segments:
        // Email button: dark green y = 630 to 684 (top: 61.5%, height: 5.3%)
        // Google button: white with border y = 690 to 744 (top: 67.4%, height: 5.3%)
        // Apple button: white with border y = 748 to 802 (top: 73.0%, height: 5.3%)
        // Create account: white with green border y = 822 to 874 (top: 80.3%, height: 5.1%)
        // Log in link: y = 888 to 922 (top: 86.7%, height: 3.3%)
        // English button: top-right x = 565 to 662 (left: 82.8%, width: 14.2%), y = 58 to 94 (top: 5.7%, height: 3.5%)

        resolve({
          width: W,
          height: H,
          email: { top: '61.5%', left: '12.8%', width: '74.4%', height: '5.3%' },
          google: { top: '67.4%', left: '12.8%', width: '74.4%', height: '5.3%' },
          apple: { top: '73.0%', left: '12.8%', width: '74.4%', height: '5.3%' },
          create: { top: '80.3%', left: '12.8%', width: '74.4%', height: '5.1%' },
          login: { top: '86.7%', left: '25.0%', width: '50.0%', height: '3.3%' },
          english: { top: '5.6%', right: '3.2%', width: '14.5%', height: '3.6%' }
        });
      };
      img.src = 'data:image/jpeg;base64,' + b64;
    });
  }, imgBase64);

  console.log('Coordinates:', JSON.stringify(coords, null, 2));
  await browser.close();
}

measure().catch(console.error);
