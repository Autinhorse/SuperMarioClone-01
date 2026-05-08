// One-shot data cleanup: zero out play_count / like_count / clear_count
// on every level row, and clear the `likes` table. These columns
// accumulated test traffic during early dev (manual play page hits,
// like-button clicks, post-clear pings) and the resulting numbers
// shouldn't be advertised as real engagement on the homepage.
//
// Usage (from repo root):
//   node web/supabase/seeds/04_reset_counts.mjs
//
// Idempotent: safe to re-run; counts that are already zero stay zero.

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
}

await loadEnvFile(ENV_PATH);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// 1. Snapshot rows that currently have non-zero counts so we can show the
//    scale of the cleanup before doing it.
const { data: before, error: beforeErr } = await supabase
  .from('levels')
  .select('id, title, play_count, like_count, clear_count')
  .or('play_count.gt.0,like_count.gt.0,clear_count.gt.0');

if (beforeErr) {
  console.error('Lookup failed:', beforeErr);
  process.exit(1);
}

if (!before || before.length === 0) {
  console.log('All counts already zero. Nothing to do.');
} else {
  console.log(`Rows with non-zero counts (${before.length}):`);
  for (const r of before) {
    console.log(
      `  ${r.id} — "${r.title}"  play=${r.play_count}  like=${r.like_count}  clear=${r.clear_count}`,
    );
  }
}

// 2. Clear the likes table. The adjust_like_count trigger will fire per
//    delete and decrement levels.like_count back toward zero, but the
//    explicit UPDATE in step 3 covers any drift between the trigger and
//    the cached column.
const { error: likesErr, count: likesDeleted } = await supabase
  .from('likes')
  .delete({ count: 'exact' })
  // Supabase requires a filter on bulk delete. Match every row whose
  // user_id is non-null (i.e. all rows — user_id is NOT NULL by schema).
  .not('user_id', 'is', null);

if (likesErr) {
  console.error('Failed to clear likes:', likesErr);
  process.exit(1);
}

console.log(`Cleared ${likesDeleted ?? 0} rows from likes.`);

// 3. Hard-reset all three counters across every level.
const { error: updErr, count: updated } = await supabase
  .from('levels')
  .update(
    { play_count: 0, like_count: 0, clear_count: 0 },
    { count: 'exact' },
  )
  .not('id', 'is', null);

if (updErr) {
  console.error('Failed to reset counts:', updErr);
  process.exit(1);
}

console.log(`Reset counts on ${updated ?? '?'} level rows.`);

// 4. Verify nothing's left.
const { data: after } = await supabase
  .from('levels')
  .select('id, play_count, like_count, clear_count')
  .or('play_count.gt.0,like_count.gt.0,clear_count.gt.0');

if (!after || after.length === 0) {
  console.log('Verified: all counts now zero.');
} else {
  console.warn(`Unexpected: ${after.length} rows still have non-zero counts:`);
  for (const r of after) console.warn(`  ${r.id}  ${JSON.stringify(r)}`);
  process.exit(1);
}
