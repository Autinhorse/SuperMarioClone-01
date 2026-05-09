import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses RLS — only for server-side
// operations that the user cannot perform with their cookie session
// (today: writes to the public level-thumbnails Storage bucket). Never
// expose this in code that ships to the browser.
//
// SUPABASE_SECRET_KEY is the project's service role key, set in
// .env.local. Same name as the seed scripts use.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY (or NEXT_PUBLIC_SUPABASE_URL) not set — service-role client unavailable.",
    );
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
