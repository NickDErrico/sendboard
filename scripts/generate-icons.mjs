// Generates Sendboard app icons as PNGs using only Node built-ins (zlib).
// Mark: an upward double-chevron (ascending / "send") in the Nocturne accent on
// the Nocturne ground, so the home-screen icon matches the app it opens.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [22, 24, 38]; // #161826 Nocturne ground
const FG = [145, 132, 217]; // #9184d9 Nocturne accent

// --- PNG encoding (RGBA, color type 6) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0 prefix
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// distance from point p to segment ab
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function render(size, contentScale = 1) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const halfW = 0.293 * size * contentScale;
  const armH = 0.176 * size * contentScale;
  const thick = 0.09 * size * contentScale;
  // two stacked chevron apexes
  const centerY = 0.4 * size;
  const gap = 0.098 * size * contentScale;
  const apexes = [centerY - gap, centerY + gap];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let onFg = false;
      for (const ay of apexes) {
        const d1 = distToSeg(x, y, cx - halfW, ay + armH, cx, ay);
        const d2 = distToSeg(x, y, cx, ay, cx + halfW, ay + armH);
        if (Math.min(d1, d2) <= thick / 2) {
          onFg = true;
          break;
        }
      }
      const c = onFg ? FG : BG;
      const i = (y * size + x) * 4;
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

const targets = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['maskable-512.png', 512, 0.78], // content inside the maskable safe zone
  ['apple-touch-icon.png', 180, 1],
];
for (const [name, size, scale] of targets) {
  writeFileSync(join(OUT, name), render(size, scale));
  console.log('wrote', name, `(${size}x${size})`);
}
