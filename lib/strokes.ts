// Andmebaasi funktsioonid tabeli public.strokes jaoks.
// Frontend kasutab neid, et ei peaks ise Supabase päringuid kirjutama.
import { supabase } from "./supabase";
import type { Seg, StrokeRow } from "./types";

/** Laeb toa kõik salvestatud jooned õiges järjekorras (mountimisel). */
export async function loadStrokes(room: string): Promise<StrokeRow[]> {
  const { data, error } = await supabase
    .from("strokes")
    .select("*")
    .eq("room", room)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StrokeRow[];
}

/** Salvestab ühe valmis joone (pointerup). Tühja massiivi ei salvesta. */
export async function saveStroke(room: string, segs: Seg[]): Promise<void> {
  if (segs.length === 0) return;
  const { error } = await supabase.from("strokes").insert({ room, data: segs });
  if (error) throw error;
}

/** Kustutab toa kõik jooned (nupp "Tühjenda"). */
export async function clearRoom(room: string): Promise<void> {
  const { error } = await supabase.from("strokes").delete().eq("room", room);
  if (error) throw error;
}