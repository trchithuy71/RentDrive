const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to calculate CRC32 (standard for PNG)
function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

// Function to write a PNG chunk
function createChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  
  const checksumBuf = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(checksumBuf), 0);

  return Buffer.concat([lenBuf, checksumBuf, crcBuf]);
}

// Draw a beautiful custom "RD" Web3 vehicle logo in the PNG buffer
function generatePngBuffer(width, height) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw pixel data buffer
  // Each scanline starts with a filter byte (0)
  const bytesPerPixel = 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const scanlineStart = y * scanlineLength;
    rawData[scanlineStart] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelStart = scanlineStart + 1 + x * bytesPerPixel;

      // Draw premium dark blue background: #1C2B3C (28, 43, 60)
      let r = 28;
      let g = 43;
      let b = 60;
      let a = 255;

      // Draw custom circular icon outline + "RD" letter in the center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.4;

      // Draw a gold border
      if (Math.abs(dist - radius) < width * 0.03) {
        // Gold: #D4AF37 (212, 175, 55)
        r = 212;
        g = 175;
        b = 55;
      } 
      // Draw "RD" initials in the center
      else if (dist < radius) {
        // Simple letter drawing algorithm for "R" and "D"
        const cellX = (x / width) * 100; // normalized 0-100
        const cellY = (y / height) * 100; // normalized 0-100

        let isLetter = false;

        // Draw R: left line from y: 35-65, top loop, diagonal leg
        if (cellX >= 35 && cellX <= 38 && cellY >= 35 && cellY <= 65) {
          isLetter = true;
        }
        // R loop top/bottom and round
        if (cellX >= 35 && cellX <= 48 && (Math.abs(cellY - 35) < 3 || Math.abs(cellY - 50) < 3)) {
          isLetter = true;
        }
        if (cellX >= 45 && cellX <= 48 && cellY >= 35 && cellY <= 50) {
          isLetter = true;
        }
        // R diagonal leg
        if (cellX >= 40 && cellX <= 48 && cellY >= 50 && cellY <= 65 && Math.abs((cellX - 40) - (cellY - 50) * 0.53) < 3) {
          isLetter = true;
        }

        // Draw D: left line from y: 35-65
        if (cellX >= 55 && cellX <= 58 && cellY >= 35 && cellY <= 65) {
          isLetter = true;
        }
        // D top/bottom curves
        if (cellX >= 55 && cellX <= 66 && (Math.abs(cellY - 35) < 3 || Math.abs(cellY - 65) < 3)) {
          isLetter = true;
        }
        // D right curve
        if (cellX >= 63 && cellX <= 66 && cellY >= 38 && cellY <= 62) {
          isLetter = true;
        }

        if (isLetter) {
          // Off-white gold for letters: #F2F1EC
          r = 242;
          g = 241;
          b = 236;
        }
      }

      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  // Compress raw pixel data
  const idatData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', idatData);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Execute Generation
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), generatePngBuffer(192, 192));
console.log('Generated icon-192x192.png');

fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), generatePngBuffer(512, 512));
console.log('Generated icon-512x512.png');

fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), generatePngBuffer(512, 512));
console.log('Generated maskable-icon-512x512.png');

console.log('PWA icons generation complete!');
