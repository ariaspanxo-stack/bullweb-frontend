import sharp from 'sharp';
import { existsSync } from 'fs';

const src = 'public/logo.png';
if (!existsSync(src)) {
  console.error('❌ No se encontró public/logo.png');
  process.exit(1);
}

const bg = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a

await sharp(src)
  .resize(192, 192, { fit: 'contain', background: bg })
  .toFile('public/pwa-192.png');
console.log('✅ pwa-192.png generado');

await sharp(src)
  .resize(512, 512, { fit: 'contain', background: bg })
  .toFile('public/pwa-512.png');
console.log('✅ pwa-512.png generado');
