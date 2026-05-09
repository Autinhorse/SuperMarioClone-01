// One-off: render + upload PNG thumbnails for every currently-published
// level. Re-runs are safe — each upload is upsert-keyed by levelId so a
// second invocation just overwrites with a freshly-rendered image.
//
// Usage (from repo root, after `npm install` in web/frontend):
//   npx tsx web/supabase/seeds/05_backfill_thumbnails.ts
//
// Env: reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY from
// web/frontend/.env.local. Service-role bypasses RLS for the
// thumbnail_url update + storage upload.

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, "../../frontend");
const ENV_PATH = resolve(FRONTEND_DIR, ".env.local");

// Resolve runtime deps out of web/frontend/node_modules. The script
// itself sits in web/supabase/seeds/, where there's no package.json
// and Node's normal walk-up wouldn't find @supabase/supabase-js.
// Same trick the existing seed scripts use.
const require = createRequire(resolve(FRONTEND_DIR, "package.json"));
const { createClient } = require("@supabase/supabase-js") as typeof import(
  "@supabase/supabase-js"
);

// The renderer reads sprite files via process.cwd() + "public/...".
// Pin cwd to the frontend dir before importing it, so the same path
// resolution works whether this script is invoked from the repo root
// or from web/frontend/ itself.
process.chdir(FRONTEND_DIR);

// Tiny .env.local loader — same shape the existing seed scripts use.
async function loadEnv(): Promise<void> {
  const text = await readFile(ENV_PATH, "utf8").catch(() => "");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  await loadEnv();

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in web/frontend/.env.local",
    );
  }

  // Imported AFTER chdir + env load so the renderer's process.cwd()
  // points at web/frontend/ for the sprite-file lookups.
  const { renderLevelThumbnail } = await import(
    "../../frontend/lib/thumbnail/render.ts"
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("levels")
    .select("id, title, data")
    .eq("status", "published");
  if (error) throw new Error(`Could not fetch levels: ${error.message}`);
  if (!rows) throw new Error("Empty result fetching published levels.");

  console.log(`Backfilling ${rows.length} published level(s)…`);

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const png = await renderLevelThumbnail(row.data);
      const path = `${row.id}.png`;
      const { error: uploadErr } = await supabase.storage
        .from("level-thumbnails")
        .upload(path, png, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadErr) throw new Error(`upload: ${uploadErr.message}`);

      const { data: publicData } = supabase.storage
        .from("level-thumbnails")
        .getPublicUrl(path);
      // Cache-bust so an overwritten image isn't masked by CDN/edge.
      const sep = publicData.publicUrl.includes("?") ? "&" : "?";
      const url = `${publicData.publicUrl}${sep}v=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("levels")
        .update({ thumbnail_url: url })
        .eq("id", row.id);
      if (updateErr) throw new Error(`db update: ${updateErr.message}`);

      console.log(`  ✓ ${row.id}  ${row.title}`);
      ok += 1;
    } catch (err) {
      console.error(`  ✗ ${row.id}  ${row.title} — ${(err as Error).message}`);
      failed += 1;
    }
  }

  console.log(`Done. ${ok} ok, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
