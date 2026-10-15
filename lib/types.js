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
 * Ala täitmine (värvipott) punktist (x, y). Liigub Broadcastiga sündmusena
 * `fill` ja salvestatakse eraldi reana, kus `data` on `[Fill]`.
 * Tulemus sõltub lõuendi seisust, seega taasesitus käib `strokes.id` järjekorras.
 *
 * @typedef {Object} Fill
 * @property {"fill"} type
 * @property {number} x
 * @property {number} y
 * @property {string} color - "#rrggbb"
 */

/**
 * Rida tabelis `strokes`.
 *
 * @typedef {Object} StrokeRow
 * @property {number} id
 * @property {string} room
 * @property {Seg[] | Fill[]} data
 * @property {string} created_at
 */

/**
 * Realtime kanali nimi toa jaoks.
 * @param {string} roomId
 */
export const roomChannel = (roomId) => `room:${roomId}`;
