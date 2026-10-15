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
 * @property {string} [uid] - joonistaja id; ainult Broadcastis (kursori asukoha jaoks), DB-sse ei salvestata
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
 * Toas olija (Presence). Presence võti on `id`, jälgitav payload on
 * `{ name, color, onlineAt }`.
 *
 * @typedef {Object} Peer
 * @property {string} id - juhuslik id, uus iga toa külastusega
 * @property {string} name
 * @property {string} color - kursori värv "#rrggbb"
 * @property {number} onlineAt - liitumise aeg (ms), värvikonflikti korral jääb värv varasemale
 */

/**
 * Kursori asukoht. Liigub Broadcastiga sündmusena `cursor`.
 * `x: null` tähendab, et kursor lahkus lõuendilt.
 * Joonistamise ajal kursorisündmusi ei saadeta, asukoht tuleb `seg.uid` ja `x1, y1` järgi.
 *
 * @typedef {Object} Cursor
 * @property {string} uid
 * @property {number | null} x
 * @property {number | null} y
 */

/**
 * Vestluse sõnum. Liigub Broadcastiga sündmusena `chat`, andmebaasi ei salvestata.
 *
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} uid
 * @property {string} name
 * @property {string} color
 * @property {string} text
 * @property {number} ts
 */

/**
 * Realtime kanali nimi toa jaoks.
 * @param {string} roomId
 */
export const roomChannel = (roomId) => `room:${roomId}`;
