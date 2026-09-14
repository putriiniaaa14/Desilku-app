import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Muncul di console browser kalau .env belum diisi — bukan error fatal saat build.
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Lihat README.md bagian 'Setup Supabase'."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
