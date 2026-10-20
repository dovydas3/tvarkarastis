// Sugeneruoja PWA ikonas (PNG) iš SVG. Paleisti: npm run icons
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const glyph = (scale) => {
  // Kalendoriaus lapelis su laikrodžiu, centruotas 512x512 drobėje.
  const s = scale;
  const o = (512 - 512 * s) / 2;
  return `<g transform="translate(${o} ${o}) scale(${s})">
    <rect x="96" y="120" width="320" height="300" rx="40" fill="#ffffff"/>
    <rect x="96" y="120" width="320" height="86" rx="40" fill="#f59e0b"/>
    <rect x="96" y="166" width="320" height="40" fill="#f59e0b"/>
    <rect x="162" y="88" width="28" height="70" rx="14" fill="#ffffff"/>
    <rect x="322" y="88" width="28" height="70" rx="14" fill="#ffffff"/>
    <circle cx="256" cy="310" r="78" fill="none" stroke="#0f766e" stroke-width="22"/>
    <path d="M256 268 V312 L288 334" fill="none" stroke="#0f766e" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
};

const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="#0f766e"/>
  ${glyph(scale)}
</svg>`;

const standard = svg({ rounded: true, scale: 1 });
const full = svg({ rounded: false, scale: 1 });
const maskable = svg({ rounded: false, scale: 0.72 });

await writeFile('public/icon.svg', standard);
await sharp(Buffer.from(standard)).resize(192, 192).png().toFile('public/pwa-192.png');
await sharp(Buffer.from(standard)).resize(512, 512).png().toFile('public/pwa-512.png');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/maskable-512.png');
// iOS pats suapvalina kampus, todėl naudojama pilna (neapvalinta) versija.
await sharp(Buffer.from(full)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('Ikonos sugeneruotos į public/');
