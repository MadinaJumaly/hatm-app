// Makes the PNG app icons from the two SVG drawings (design §H). Run after changing a drawing:
//   node scripts/make-icons.ts
import sharp from "sharp";

const dir = "public/icons";
const outputs = [
  { from: "icon.svg", to: "icon-192.png", size: 192 },
  { from: "icon.svg", to: "icon-512.png", size: 512 },
  // Maskable: full-bleed background, drawing inside the safe zone (Android cuts the corners).
  { from: "maskable.svg", to: "maskable-512.png", size: 512 },
  // iPhone home screen: no transparency (iOS rounds the corners itself).
  { from: "maskable.svg", to: "apple-touch-icon.png", size: 180 },
];

for (const { from, to, size } of outputs) {
  await sharp(`${dir}/${from}`, { density: 300 }).resize(size, size).png().toFile(`${dir}/${to}`);
  console.log(`${dir}/${to}`);
}
