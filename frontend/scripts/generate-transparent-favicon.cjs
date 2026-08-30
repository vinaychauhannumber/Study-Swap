const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function inspectAndExtract() {
  const srcPath = '/Users/vinaychauhan/.gemini/antigravity/brain/b1de4498-2623-4080-bab2-80fa2cb4e317/.user_uploaded/media_1788096996879.jpg';
  const publicDir = '/Users/vinaychauhan/.gemini/antigravity/scratch/studyswipe/frontend/public';

  const image = sharp(srcPath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Let's take the entire width and y: 0 to 600 (above the "BroPlz" text which starts at y > 590)
  const cropLeft = 0;
  const cropTop = 0;
  const cropWidth = width;
  const cropHeight = Math.floor(height * 0.58); // Exactly cuts off before "BroPlz" text

  const { data, info } = await sharp(srcPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  console.log(`Original background color: rgb(${bgR}, ${bgG}, ${bgB})`);

  const visited = new Uint8Array(w * h);
  const queue = [];

  function isBg(x, y) {
    const idx = (y * w + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    return dist < 36; // Tolerant threshold for JPEG compression artifacts on background
  }

  // Flood fill from all 4 borders of the upper half
  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const pos = y * w + x;

    if (visited[pos]) continue;
    visited[pos] = 1;

    if (isBg(x, y)) {
      const idx = pos * channels;
      data[idx + 3] = 0; // Alpha transparent

      if (x > 0 && !visited[pos - 1]) queue.push(x - 1, y);
      if (x < w - 1 && !visited[pos + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[pos - w]) queue.push(x, y - 1);
      if (y < h - 1 && !visited[pos + w]) queue.push(x, y + 1);
    }
  }

  // Find tight bounding box of visible icon pixels
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * channels + 3];
      if (alpha > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const tightW = maxX - minX + 1;
  const tightH = maxY - minY + 1;
  console.log(`Perfect tight bounding box: ${tightW}x${tightH} at (${minX}, ${minY})`);

  // Extract perfectly bounded graphic
  const tightPng = await sharp(data, {
    raw: { width: w, height: h, channels: 4 }
  })
  .extract({ left: minX, top: minY, width: tightW, height: tightH })
  .png()
  .toBuffer();

  // Create a perfectly centered 512x512 icon with 5% breathing margin
  const size = 512;
  const maxDim = Math.max(tightW, tightH);
  const targetSize = Math.floor(size * 0.92);
  const scale = targetSize / maxDim;
  const resizedW = Math.round(tightW * scale);
  const resizedH = Math.round(tightH * scale);

  const resizedGraphic = await sharp(tightPng)
    .resize(resizedW, resizedH)
    .toBuffer();

  const leftOffset = Math.floor((size - resizedW) / 2);
  const topOffset = Math.floor((size - resizedH) / 2);

  const finalIcon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: resizedGraphic, top: topOffset, left: leftOffset }])
  .png()
  .toBuffer();

  // Save favicon.png, apple-touch-icon.png, and logo-icon.png
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), finalIcon);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), finalIcon);
  fs.writeFileSync(path.join(publicDir, 'logo-icon.png'), finalIcon);

  console.log('✅ Transparent icon generated with perfect proportions & zero clipping!');
}

inspectAndExtract().catch(console.error);
