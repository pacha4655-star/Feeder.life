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
  
  console.log('Original image dimensions:', dimensions);
  
  // Crop the central animal photograph
  const croppedDataUrl = await page.evaluate((dims) => {
    const img = document.getElementById('srcImg');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Exact bounding box of the central photo in the reference image (1024x533):
    // The photo is roughly x: 195 to 555 (w: 360), y: 80 to 425 (h: 345)
    const cropX = Math.round(dims.width * 0.190);
    const cropY = Math.round(dims.height * 0.155);
    const cropW = Math.round(dims.width * 0.355);
    const cropH = Math.round(dims.height * 0.640);
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL('image/jpeg', 0.95);
  }, dimensions);
  
  const base64Data = croppedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync('public/images/feeder-animals-hero.jpg', Buffer.from(base64Data, 'base64'));
  console.log('Saved public/images/feeder-animals-hero.jpg successfully!');
  
  // Also crop the user avatar from the right side for the default avatar asset
  const avatarDataUrl = await page.evaluate((dims) => {
    const img = document.getElementById('srcImg');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // User avatar is circular around x: 725 to 870, y: 100 to 245
    const cropX = Math.round(dims.width * 0.725);
    const cropY = Math.round(dims.height * 0.190);
    const cropW = Math.round(dims.width * 0.142);
    const cropH = Math.round(dims.height * 0.272);
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL('image/jpeg', 0.95);
  }, dimensions);
  
  const avatarBase64Data = avatarDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync('public/images/feeder-default-avatar.jpg', Buffer.from(avatarBase64Data, 'base64'));
  console.log('Saved public/images/feeder-default-avatar.jpg successfully!');
  
  await browser.close();
}

main().catch(console.error);
