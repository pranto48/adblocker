/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Iconic Unique "Block" Logo & High-Fidelity PNG/SVG Generator
 * Features 4x Supersampled Anti-Aliasing, Hexagonal Cyber Shield, and "A" Block Barrier.
 */

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

// Check if point (nx, ny) is inside the Hexagonal Cyber Shield
function getShieldBounds(ny, scale = 1.0) {
  const topY = -0.92 * scale;
  const midTopY = -0.65 * scale;
  const midBottomY = 0.22 * scale;
  const bottomY = 0.95 * scale;
  const maxW = 0.88 * scale;

  if (ny < topY || ny > bottomY) return -1;

  if (ny < midTopY) {
    // Slanted top edge
    return maxW * (ny - topY) / (midTopY - topY);
  } else if (ny <= midBottomY) {
    // Vertical side edge
    return maxW;
  } else {
    // Converging bottom edge
    return maxW * (bottomY - ny) / (bottomY - midBottomY);
  }
}

// Evaluate single sample point for color (RGBA)
function samplePoint(nx, ny) {
  const outerW = getShieldBounds(ny, 1.0);
  if (outerW < 0 || Math.abs(nx) > outerW) {
    // Outside shield: ambient neon glow check
    const dist = Math.sqrt(nx * nx + ny * ny);
    if (dist < 1.25) {
      const glow = Math.max(0, 1 - (dist - 0.75) / 0.5);
      return [0, 242, 254, Math.floor(glow * 45)];
    }
    return [0, 0, 0, 0];
  }

  // Border check (rim thickness 12%)
  const innerW = getShieldBounds(ny, 0.84);
  const isBorder = (innerW < 0 || Math.abs(nx) > innerW);

  if (isBorder) {
    // Neon electric gradient (Cyan to Bright Blue)
    const t = (ny + 0.92) / 1.87;
    const r = Math.floor(0 + t * 40);
    const g = Math.floor(242 - t * 40);
    const b = 254;
    return [r, g, b, 255];
  }

  // Center Emblem: Stylized "A" + Heavy "BLOCK" Barrier Bar
  // 1. Heavy Central BLOCK Bar: nx from -0.60 to 0.60, ny from -0.06 to 0.16
  const inBlockBar = (Math.abs(nx) <= 0.58 && ny >= -0.06 && ny <= 0.16);

  // 2. Left and Right Stems of "A"
  // Apex: ny from -0.65 to -0.42
  let inAStem = false;
  if (ny >= -0.65 && ny <= 0.62) {
    // Centerline of stem:
    const stemCenter = (ny - (-0.65)) * 0.72; // expands outwards
    const stemThickness = 0.14;
    // Left stem
    if (Math.abs(nx - (-stemCenter)) <= stemThickness) inAStem = true;
    // Right stem
    if (Math.abs(nx - stemCenter) <= stemThickness) inAStem = true;
  }

  // 3. Central Prismatic Core Diamond
  const diamondDist = Math.abs(nx) / 0.14 + Math.abs(ny - 0.05) / 0.14;
  const inDiamond = (diamondDist <= 1.0);

  if (inDiamond) {
    // Brilliant white diamond core
    return [255, 255, 255, 255];
  }

  if (inBlockBar) {
    // Solid impervious block bar in glowing cyan with white trim
    if (ny <= -0.03 || ny >= 0.13 || Math.abs(nx) >= 0.54) {
      return [255, 255, 255, 255]; // High-contrast border
    }
    return [0, 242, 254, 255]; // Neon cyan block body
  }

  if (inAStem) {
    // Stem gradient: white at top to cyan at bottom
    const stemT = (ny + 0.65) / 1.27;
    const r = Math.floor(255 - stemT * 180);
    const g = Math.floor(255 - stemT * 30);
    const b = 255;
    return [r, g, b, 250];
  }

  // Inner Dark Slate Shield Body Gradient with cyber depth
  const grad = (ny + 0.92) / 1.87;
  const bgR = Math.floor(6 + grad * 10);
  const bgG = Math.floor(13 + grad * 18);
  const bgB = Math.floor(28 + grad * 35);
  return [bgR, bgG, bgB, 245];
}

// Generate supersampled PNG (4x4 = 16 subpixels per pixel)
function generateIconPNG(size) {
  const width = size;
  const height = size;
  const rawRows = [];

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;
  const subSamples = 4; // 4x4 supersampling

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        for (let sx = 0; sx < subSamples; sx++) {
          const px = x + (sx + 0.5) / subSamples;
          const py = y + (sy + 0.5) / subSamples;

          const nx = (px - cx) / radius;
          const ny = (py - cy) / radius;

          const [r, g, b, a] = samplePoint(nx, ny);
          totalR += (r * a) / 255;
          totalG += (g * a) / 255;
          totalB += (b * a) / 255;
          totalA += a;
        }
      }

      const count = subSamples * subSamples;
      const finalA = Math.round(totalA / count);
      if (finalA > 0) {
        row[idx] = Math.min(255, Math.round((totalR / totalA) * 255));
        row[idx + 1] = Math.min(255, Math.round((totalG / totalA) * 255));
        row[idx + 2] = Math.min(255, Math.round((totalB / totalA) * 255));
        row[idx + 3] = finalA;
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
  const buf = generateIconPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated supersampled icon${size}.png (${buf.length} bytes)`);
});

// Generate matching modern vector SVG logo
const svgContent = `<!--
==============================================================================
# Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
# Made By Arif (https://arifmahmud.com/)
# Project: AmpBlock
==============================================================================
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070e1e"/>
      <stop offset="50%" stop-color="#0b172e"/>
      <stop offset="100%" stop-color="#040813"/>
    </linearGradient>

    <linearGradient id="neonBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#4facfe"/>
    </linearGradient>

    <linearGradient id="blockBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#00c6ff"/>
    </linearGradient>

    <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Hexagonal Cyber Block Shield -->
  <polygon points="256,22 445,86 445,310 256,490 67,310 67,86" 
           fill="url(#shieldBg)" 
           stroke="url(#neonBorder)" 
           stroke-width="16" 
           stroke-linejoin="round"
           filter="url(#cyberGlow)"/>

  <!-- Inner Architectural Facet Line -->
  <polygon points="256,52 418,106 418,296 256,450 94,296 94,106" 
           fill="none" 
           stroke="rgba(0, 242, 254, 0.22)" 
           stroke-width="4" 
           stroke-linejoin="round"/>

  <!-- Stylized "A" Block Emblem -->
  <!-- Left Leg -->
  <polygon points="256,110 198,255 236,255 272,175 256,110" fill="#ffffff"/>
  <polygon points="198,255 146,396 192,396 232,284 192,284" fill="url(#blockBarGrad)"/>
  
  <!-- Right Leg -->
  <polygon points="256,110 314,255 276,255 240,175 256,110" fill="#ffffff"/>
  <polygon points="314,255 366,396 320,396 280,284 320,284" fill="url(#blockBarGrad)"/>

  <!-- Solid Indestructible BLOCK Barrier Bar -->
  <rect x="144" y="240" width="224" height="42" rx="6" 
        fill="url(#blockBarGrad)" 
        stroke="#ffffff" 
        stroke-width="4" 
        filter="url(#cyberGlow)"/>

  <!-- Center Prismatic Energy Core -->
  <polygon points="256,230 274,261 256,292 238,261" fill="#ffffff"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'shield.svg'), svgContent, 'utf-8');
console.log("Generated modern unique block shield.svg");
