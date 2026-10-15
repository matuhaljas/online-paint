// Andmebaasi funktsioonid tabeli public.strokes jaoks.
// Frontend kasutab neid, et ei peaks ise Supabase päringuid kirjutama.
import { supabase } from "./supabase";

/** @typedef {import("./types").Seg} Seg */
/** @typedef {import("./types").Fill} Fill */
/** @typedef {import("./types").StrokeRow} StrokeRow */

/**
 * Laeb toa kõik salvestatud jooned õiges järjekorras (mountimisel).
 * @param {string} room
 * @returns {Promise<StrokeRow[]>}
 */
export async function loadStrokes(room) {
  const { data, error } = await supabase
    .from("strokes")
    .select("*")
    .eq("room", room)
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Salvestab ühe valmis joone (pointerup) või täitmise. Tühja massiivi ei salvesta.
 * @param {string} room
 * @param {Seg[] | Fill[]} items
 * @returns {Promise<void>}
 */
export async function saveStroke(room, items) {
  if (items.length === 0) return;
  const { error } = await supabase.from("strokes").insert({ room, data: items });
  if (error) throw error;
}

/**
 * Kustutab toa kõik jooned (nupp "Tühjenda").
 * @param {string} room
 * @returns {Promise<void>}
 */
export async function clearRoom(room) {
  const { error } = await supabase.from("strokes").delete().eq("room", room);
  if (error) throw error;
}
