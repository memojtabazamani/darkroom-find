const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (scanlineLength + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    let crc = 0xffffffff;
    for (const b of typeBuf) crc = updateCrc(crc, b);
    for (const b of data) crc = updateCrc(crc, b);
    crc = (crc ^ 0xffffffff) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  function updateCrc(crc, byte) {
    return (crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw spotlight search icon: Dark rounded squircle with glowing cyan search lens and magenta active match
function drawSpotlightIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const rCorner = w * 0.22;

  // Squircle background test
  const dx = Math.max(0, Math.abs(x - cx) - (w * 0.5 - rCorner));
  const dy = Math.max(0, Math.abs(y - cy) - (h * 0.5 - rCorner));
  const distSquircle = Math.sqrt(dx * dx + dy * dy);

  if (distSquircle > rCorner) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Dark background: deep navy / charcoal
  let r = 10, g = 15, b = 28, a = 255;

  // Search lens geometry
  const lx = cx - w * 0.08;
  const ly = cy - h * 0.08;
  const lRadius = w * 0.28;
  const lThickness = Math.max(1.5, w * 0.09);

  const distLens = Math.hypot(x - lx, y - ly);
  const ringDist = Math.abs(distLens - lRadius);

  // Handle geometry: line extending to bottom-right
  const handleStartX = lx + lRadius * 0.707;
  const handleStartY = ly + lRadius * 0.707;
  const handleLen = w * 0.26;
  const handleEndX = handleStartX + handleLen * 0.707;
  const handleEndY = handleStartY + handleLen * 0.707;

  // Distance to handle line segment
  const hdx = handleEndX - handleStartX;
  const hdy = handleEndY - handleStartY;
  const t = Math.max(0, Math.min(1, ((x - handleStartX) * hdx + (y - handleStartY) * hdy) / (hdx * hdx + hdy * hdy)));
  const projX = handleStartX + t * hdx;
  const projY = handleStartY + t * hdy;
  const distHandle = Math.hypot(x - projX, y - projY);

  // Cyan spotlight beam / glow
  if (ringDist <= lThickness * 0.5) {
    // Sharp neon cyan
    return [0, 240, 255, 255];
  } else if (ringDist <= lThickness * 1.5) {
    // Cyan glow edge
    const alpha = Math.max(0, 1 - (ringDist - lThickness * 0.5) / lThickness);
    return [0, 220, 255, Math.floor(180 * alpha)];
  }

  // Lens handle (cyan/white neon)
  if (distHandle <= lThickness * 0.45) {
    return [0, 240, 255, 255];
  }

  // Inside lens: soft magenta beam dot / highlight
  if (distLens < lRadius - lThickness * 0.5) {
    const dotDist = Math.hypot(x - lx, y - ly);
    if (dotDist <= lRadius * 0.4) {
      // Magenta focal point (#ff007f)
      return [255, 0, 127, 240];
    }
    // Soft transparent beam
    return [0, 100, 180, 80];
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const buf = createPng(size, size, drawSpotlightIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
});
