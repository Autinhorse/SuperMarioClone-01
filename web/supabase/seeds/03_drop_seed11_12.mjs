// One-shot cleanup: removes the orphaned `seed11` / `seed12` level rows
// left behind from when the campaign had 12 levels. The current seed
// (02) only upserts 01..10, so 11/12 would otherwise sit forever in
// the user's drafts list with stale "Sandbox NN" titles.
//
// Usage (from repo root):
//   node web/supabase/seeds/03_drop_seed11_12.mjs
//
// Idempotent: prints "0 rows" if the cleanup has already happened.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const FRONTEND_DIR = resolve(REPO_ROOT, 'web/frontend');
const ENV_PATH = resolve(FRONTEND_DIR, '.env.local');

const require = createRequire(resolve(FRONTEND_DIR, 'package.json'));
const { createClient } = require('@supabase/supabase-js');

async function loadEnvFile(path) {
  try {
    const text = await readFile(path, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

await loadEnvFile(ENV_PATH);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
  console.error(`Looked in ${ENV_PATH}.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TARGET_IDS = ['seed11', 'seed12'];

const { data: existing, error: selErr } = await supabase
  .from('levels')
  .select('id, title, status, is_featured, creator_id')
  .in('id', TARGET_IDS);

if (selErr) {
  console.error('Lookup failed:', selErr);
  process.exit(1);
}

if (!existing || existing.length === 0) {
  console.log('Nothing to delete — seed11/seed12 already gone.');
  process.exit(0);
}

console.log('About to delete:');
for (const r of existing) {
  console.log(`  ${r.id} — "${r.title}" (status=${r.status}, featured=${r.is_featured})`);
}

const { error: delErr, count } = await supabase
  .from('levels')
  .delete({ count: 'exact' })
  .in('id', TARGET_IDS);

if (delErr) {
  console.error('Delete failed:', delErr);
  process.exit(1);
}

console.log(`Deleted ${count ?? existing.length} rows.`);
