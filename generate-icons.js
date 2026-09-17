/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 */

// Pure Node.js script using built-in zlib to output valid PNG icon files
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const body = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generateShieldPNG(size) {
  const width = size;
  const height = size;
  const rawRows = [];

  // Center coords & scale
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;

      // Normalized coords [-1, 1]
      const nx = (x - cx) / (width * 0.46);
      const ny = (y - cy) / (height * 0.46);

      let inShield = false;
      let inBorder = false;
      let inGlow = false;

      const dist = Math.sqrt(nx * nx + ny * ny);

      const topY = -0.78;
      const bottomY = 0.88;
      const sideCurve = 1.0 - Math.pow(Math.max(0, ny), 1.6) * 0.85;

      if (ny >= topY && ny <= bottomY && Math.abs(nx) <= sideCurve) {
        inShield = true;
        const innerSideCurve = sideCurve * 0.82;
        const innerTopY = topY + 0.15;
        const innerBottomY = bottomY - 0.15;
        if (ny < innerTopY || ny > innerBottomY || Math.abs(nx) > innerSideCurve) {
          inBorder = true;
        }
      } else if (dist < 1.3) {
        inGlow = true;
      }

      let inEmblem = false;
      if (inShield && !inBorder) {
        const inUpper = (nx >= -0.3 + (ny + 0.45) * 0.7 && nx <= 0.2 + (ny + 0.45) * 0.7 && ny >= -0.45 && ny <= 0.0);
        const inLower = (nx >= -0.2 + (ny - 0.0) * 0.6 && nx <= 0.3 + (ny - 0.0) * 0.6 && ny >= -0.05 && ny <= 0.5);
        if (inUpper || inLower) {
          inEmblem = true;
        }
      }

      if (inEmblem) {
        row[idx] = 255;
        row[idx + 1] = 255;
        row[idx + 2] = 255;
        row[idx + 3] = 255;
      } else if (inBorder) {
        row[idx] = 0;
        row[idx + 1] = 242;
        row[idx + 2] = 254;
        row[idx + 3] = 245;
      } else if (inShield) {
        const grad = (ny + 1) / 2;
        row[idx] = Math.floor(10 + grad * 15);
        row[idx + 1] = Math.floor(25 + grad * 40);
        row[idx + 2] = Math.floor(65 + grad * 80);
        row[idx + 3] = 240;
      } else if (inGlow) {
        const glowFactor = Math.max(0, 1 - (dist - 0.8) / 0.5);
        row[idx] = 0;
        row[idx + 1] = 230;
        row[idx + 2] = 255;
        row[idx + 3] = Math.floor(glowFactor * 60);
      } else {
        row[idx] = 0;
        row[idx + 1] = 0;
        row[idx + 2] = 0;
        row[idx + 3] = 0;
      }
    }
    rawRows.push(row);
  }

  const rawBuffer = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawBuffer);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const buf = generateShieldPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
});

const svgContent = `<!--
==============================================================================
# Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
# Made By Arif (https://arifmahmud.com/)
# Project: AmpBlock
==============================================================================
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a192f"/>
      <stop offset="100%" stop-color="#0f3460"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#4facfe"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <path d="M128 20 C180 20 220 40 220 80 C220 160 160 215 128 236 C96 215 36 160 36 80 C36 40 76 20 128 20 Z" 
        fill="url(#shieldGrad)" stroke="url(#borderGrad)" stroke-width="10" filter="url(#glow)"/>
  <polygon points="135,50 95,130 130,130 115,205 165,115 130,115" fill="#00f2fe" filter="url(#glow)"/>
  <polygon points="135,50 95,130 130,130 115,205 165,115 130,115" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'shield.svg'), svgContent, 'utf-8');
console.log("Generated shield.svg with copyright");
