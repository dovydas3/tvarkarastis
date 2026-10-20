// Sugeneruoja PWA ikonas (PNG) iš SVG. Paleisti: npm run icons
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Juodas fonas, baltos didelės raidės dviem eilutėmis: „KIRK“ / „ME“.
const glyph = (scale) => {
  const s = scale;
  const o = (512 - 512 * s) / 2;
  const text = (y, word) =>
    `<text x="256" y="${y}" text-anchor="middle" fill="#ffffff" font-family="'Arial Black', 'Segoe UI Black', Impact, Arial, sans-serif" font-weight="900" font-size="168" letter-spacing="2">${word}</text>`;
  return `<g transform="translate(${o} ${o}) scale(${s})">
    ${text(242, 'KIRK')}
    ${text(410, 'ME')}
  </g>`;
};

const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="#000000"/>
  ${glyph(scale)}
</svg>`;

const standard = svg({ rounded: true, scale: 1 });
const full = svg({ rounded: false, scale: 1 });
// Android „maskable“ ikona apkerpama apskritimu – tekstas sumažintas į saugią zoną.
const maskable = svg({ rounded: false, scale: 0.74 });

await writeFile('public/icon.svg', standard);
await sharp(Buffer.from(standard)).resize(192, 192).png().toFile('public/pwa-192.png');
await sharp(Buffer.from(standard)).resize(512, 512).png().toFile('public/pwa-512.png');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/maskable-512.png');
// iOS pats suapvalina kampus, todėl naudojama pilna (neapvalinta) versija.
await sharp(Buffer.from(full)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('Ikonos sugeneruotos į public/');
