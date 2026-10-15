/**
 * Üks joone lõik. Liigub Broadcastiga sündmusena `seg` ja
 * salvestatakse massiivina `strokes.data` veergu.
 * Koordinaadid on lõuendi pikslites (1000×600).
 *
 * @typedef {Object} Seg
 * @property {number} x0
 * @property {number} y0
 * @property {number} x1
 * @property {number} y1
 * @property {string} color - CSS värv, nt "#111111"
 * @property {number} size - pintsli laius pikslites
 */

/**
 * Rida tabelis `strokes`.
 *
 * @typedef {Object} StrokeRow
 * @property {number} id
 * @property {string} room
 * @property {Seg[]} data
 * @property {string} created_at
 */

export {};
