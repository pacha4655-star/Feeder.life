const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function cleanStatusBar() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load from the source reference artifact or base image
  const imgPath = path.resolve('public/images/feeder-mobile-login-bg.jpg');
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');

  await page.setContent('<html><body style="margin:0"><canvas id="c"></canvas></body></html>');

  const cleanedBase64 = await page.evaluate(async (b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('c');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const width = canvas.width;
        const imgData = ctx.getImageData(0, 0, width, 70);
        const data = imgData.data;

        // On the right side (x: 500 to 670, y: 0 to 45), the sky is a vertical/horizontal smooth gradient
        // Let's interpolate right side smoothly from y=48 down to y=0, and x=490 to x=675
        for (let y = 0; y <= 45; y++) {
          for (let x = 500; x < width - 5; x++) {
            const targetIdx = (y * width + x) * 4;
            // Sample clean sky at y=48 and y=50
            const sampleY = 48;
            const sampleIdx = (sampleY * width + x) * 4;
            
            // Sky has slight subtle vertical gradient: top is slightly lighter
            const factor = 1 + (48 - y) * 0.0008;
            data[targetIdx] = Math.min(255, Math.round(data[sampleIdx] * factor));
            data[targetIdx+1] = Math.min(255, Math.round(data[sampleIdx+1] * factor));
            data[targetIdx+2] = Math.min(255, Math.round(data[sampleIdx+2] * factor));
          }
        }

        // On the left side (x: 35 to 145, y: 0 to 45):
        // There are green leaves on top-left (x: 0-90) and soft sky (x: 90-150)
        // Let's vertically interpolate column-by-column from clean pixels below (y: 46-52) and above if available
        for (let x = 35; x <= 145; x++) {
          const sampleY = 48;
          const sampleIdx = (sampleY * width + x) * 4;
          const r = data[sampleIdx];
          const g = data[sampleIdx+1];
          const b = data[sampleIdx+2];

          for (let y = 0; y <= 45; y++) {
            const targetIdx = (y * width + x) * 4;
            const factor = 1 + (48 - y) * 0.0005;
            data[targetIdx] = Math.min(255, Math.round(r * factor));
            data[targetIdx+1] = Math.min(255, Math.round(g * factor));
            data[targetIdx+2] = Math.min(255, Math.round(b * factor));
          }
        }

        // Horizontal Gaussian-like blend on transition boundaries (x: 30-40, 140-150, 495-510)
        for (let y = 0; y <= 48; y++) {
          for (let x = 10; x < width - 10; x++) {
            // Smooth 5-pixel horizontal blur in top band
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let dx = -2; dx <= 2; dx++) {
              const sIdx = (y * width + (x + dx)) * 4;
              sumR += data[sIdx];
              sumG += data[sIdx+1];
              sumB += data[sIdx+2];
              count++;
            }
            const cIdx = (y * width + x) * 4;
            // apply gentle blend
            data[cIdx] = Math.round(sumR / count);
            data[cIdx+1] = Math.round(sumG / count);
            data[cIdx+2] = Math.round(sumB / count);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.98));
      };
      img.src = 'data:image/jpeg;base64,' + b64;
    });
  }, imgBase64);

  const base64Data = cleanedBase64.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync('public/images/feeder-mobile-login-bg.jpg', Buffer.from(base64Data, 'base64'));
  console.log('Cleaned image saved perfectly to public/images/feeder-mobile-login-bg.jpg');

  await browser.close();
}

cleanStatusBar().catch(console.error);
