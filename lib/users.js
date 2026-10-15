// Toas olijad (Presence): nimed ja kursorite värvid.

/** @typedef {import("./types").Peer} Peer */

// Hästi eristuvad värvid kursorite jaoks. Iga toas olija saab vaba värvi.
export const USER_COLORS = [
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
];

const NAMES = ["Rebane", "Karu", "Ilves", "Hunt", "Jänes", "Siil", "Põder", "Kährik", "Orav", "Mäger"];
const NAME_KEY = "online-paint:name";

/**
 * Juhuslik id. crypto.randomUUID() on brauseris olemas ainult turvalises kontekstis
 * (https või localhost), aga dev-serverit avatakse ka http + IP kaudu.
 * crypto.getRandomValues() töötab mõlemal juhul.
 */
export function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Esimene värv, mida keegi teine ei kasuta. Kui kõik on võetud, valitakse id järgi.
 * @param {Peer[]} others
 * @param {string} id
 */
export function pickColor(others, id) {
  const used = new Set(others.map((p) => p.color));
  return USER_COLORS.find((c) => !used.has(c)) ?? USER_COLORS[hash(id) % USER_COLORS.length];
}

/**
 * Teeb Presence olekust osalejate nimekirja, vanimad eespool.
 * @param {Record<string, any[]>} state - channel.presenceState()
 * @returns {Peer[]}
 */
export function readPeers(state) {
  return Object.entries(state)
    .map(([id, metas]) => {
      const m = metas[metas.length - 1] ?? {};
      return { id, name: m.name ?? "?", color: m.color ?? "#888888", onlineAt: m.onlineAt ?? 0 };
    })
    .sort((a, b) => a.onlineAt - b.onlineAt || a.id.localeCompare(b.id));
}

/** Salvestatud nimi või juhuslik loomanimi. */
export function loadName() {
  try {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) return saved;
  } catch {
    // localStorage võib olla keelatud (privaatne aken)
  }
  return `${NAMES[Math.floor(Math.random() * NAMES.length)]} ${Math.floor(Math.random() * 90) + 10}`;
}

/** @param {string} name */
export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // pole hullu, nimi kehtib vähemalt selle seansi ajal
  }
}
