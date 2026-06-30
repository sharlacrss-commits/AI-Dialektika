import { createClient } from "@supabase/supabase-js";

// Klien service-role. HANYA di server (route handler). Melewati RLS.
// Dipakai untuk ekspor data riset oleh admin/peneliti.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
