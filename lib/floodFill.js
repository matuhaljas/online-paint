// Kui palju võib piksli värv (iga kanal) algpunkti värvist erineda, et see täidetaks.
// Vajalik, sest jooned on antialiasitud ja servapikslid on vahetoonides.
const TOLERANCE = 40;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Täidab punktist (x, y) alates ühendatud sama värvi ala (4-naabrus).
 * Täidetud ala laiendatakse 1 piksli võrra, et antialiasitud servadesse
 * heledat äärist ei jääks.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} color - "#rrggbb"
 */
export function floodFill(ctx, x, y, color) {
  const { width, height } = ctx.canvas;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return;

  const image = ctx.getImageData(0, 0, width, height);
  const px = image.data;
  const [r, g, b] = hexToRgb(color);

  const start = (y * width + x) * 4;
  const tr = px[start];
  const tg = px[start + 1];
  const tb = px[start + 2];
  if (tr === r && tg === g && tb === b) return;

  const matches = (i) =>
    Math.abs(px[i * 4] - tr) <= TOLERANCE &&
    Math.abs(px[i * 4 + 1] - tg) <= TOLERANCE &&
    Math.abs(px[i * 4 + 2] - tb) <= TOLERANCE;

  // Iga piksel lisatakse virna ülimalt korra, seega piisab width*height suurusest.
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let sp = 0;
  let count = 0;
  const first = y * width + x;
  seen[first] = 1;
  stack[sp++] = first;

  const push = (n) => {
    if (!seen[n] && matches(n)) {
      seen[n] = 1;
      stack[sp++] = n;
    }
  };

  // Virnast võetud indeksid kogume samasse massiivi algusesse (count ≤ sp alati),
  // et hiljem täidetud ala uuesti läbi käia.
  while (sp > count) {
    const i = stack[count++];
    const cx = i % width;
    if (cx > 0) push(i - 1);
    if (cx < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < width * (height - 1)) push(i + width);
  }

  const paint = (i) => {
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  };

  for (let k = 0; k < count; k++) {
    const i = stack[k];
    const cx = i % width;
    paint(i);
    if (cx > 0) paint(i - 1);
    if (cx < width - 1) paint(i + 1);
    if (i >= width) paint(i - width);
    if (i < width * (height - 1)) paint(i + width);
  }

  ctx.putImageData(image, 0, 0);
}
