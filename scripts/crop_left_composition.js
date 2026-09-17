const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const imgPath = 'C:\\Users\\Pachamuthu S\\.gemini\\antigravity-ide\\brain\\48c05c42-dc31-47db-b14a-a3bd84b87532\\.user_uploaded\\media_1789659923160.png';
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:transparent;">
        <img id="srcImg" src="data:image/png;base64,${imgBase64}" />
        <canvas id="cropCanvas"></canvas>
      </body>
    </html>
  `);
  
  await page.waitForFunction(() => {
    const img = document.getElementById('srcImg');
    return img && img.complete && img.naturalWidth > 0;
  });
  
  const dimensions = await page.evaluate(() => {
    const img = document.getElementById('srcImg');
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  
  // Crop the entire left composition (width 60% of image)
  const leftDataUrl = await page.evaluate((dims) => {
    const img = document.getElementById('srcImg');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Left section is from x: 0 to x: 615 (of 1024 width)
    const cropX = 0;
    const cropY = 0;
    const cropW = Math.round(dims.width * 0.601);
    const cropH = dims.height;
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL('image/png');
  }, dimensions);
  
  const leftBase64 = leftDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('public/images/feeder-login-left-composition.png', Buffer.from(leftBase64, 'base64'));
  console.log('Saved public/images/feeder-login-left-composition.png');
  
  // Also crop the central animal photo without badges for maximum flexibility
  const purePhotoDataUrl = await page.evaluate((dims) => {
    const img = document.getElementById('srcImg');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    const cropX = Math.round(dims.width * 0.198);
    const cropY = Math.round(dims.height * 0.170);
    const cropW = Math.round(dims.width * 0.335);
    const cropH = Math.round(dims.height * 0.610);
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL('image/jpeg', 0.98);
  }, dimensions);
  
  const purePhotoBase64 = purePhotoDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync('public/images/feeder-animals-photo.jpg', Buffer.from(purePhotoBase64, 'base64'));
  console.log('Saved public/images/feeder-animals-photo.jpg');

  await browser.close();
}

main().catch(console.error);
