import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Puudub NEXT_PUBLIC_SUPABASE_URL või NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)");
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 60 } },
});