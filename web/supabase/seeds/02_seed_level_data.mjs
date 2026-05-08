// Dev seed: load the 10 campaign level JSONs from
// games/ricochet/public/levels/ into public.levels via service-role key.
//
// All 10 levels are published + featured today (single-creator stage).
// When real users start publishing, narrow `is_featured` to a curated
// subset so the homepage strip doesn't fill up with first-party work.
//
// Re-running upserts metadata/data; play_count, like_count, clear_count
// are left untouched on conflict (only set on first insert via table defaults).
//
// Usage (from repo root, after `npm install` in web/frontend):
//   node web/supabase/seeds/02_seed_level_data.mjs
//
// Env: reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY from
// web/frontend/.env.local (or process env). SEED_USERNAME overrides
// the default creator username (`autinhorse`).

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const LEVELS_DIR = resolve(REPO_ROOT, 'games/ricochet/public/levels');
const FRONTEND_DIR = resolve(REPO_ROOT, 'web/frontend');
const ENV_PATH = resolve(FRONTEND_DIR, '.env.local');

// Resolve @supabase/supabase-js out of web/frontend's node_modules so the
// script doesn't need its own package.json.
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
const CREATOR_USERNAME = process.env.SEED_USERNAME ?? 'autinhorse';

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
  console.error(`Looked in ${ENV_PATH}.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profile, error: profileErr } = await supabase
  .from('profiles')
  .select('id, username')
  .ilike('username', CREATOR_USERNAME)
  .maybeSingle();

if (profileErr || !profile) {
  console.error(
    `Could not find profile for username "${CREATOR_USERNAME}":`,
    profileErr ?? '(not found — sign up that user first)',
  );
  process.exit(1);
}
console.log(`Seeding levels owned by ${profile.username} (${profile.id})`);

const META = {
  '01': { title: 'Laser Maze',      status: 'published', is_featured: true, description: 'Bounce through narrow gaps to reach the goal.' },
  '02': { title: 'Spin & Escape',   status: 'published', is_featured: true, description: 'Dodge the rotating gear and find the exit.' },
  '03': { title: 'Bouncy Path',     status: 'published', is_featured: true, description: 'Time your jumps over moving conveyors.' },
  '04': { title: 'The Last Jump',   status: 'published', is_featured: true, description: 'Make every move count.' },
  '05': { title: 'Tricky Turn',     status: 'published', is_featured: true, description: 'A short level with a sting in the tail.' },
  '06': { title: 'Belt Driven',     status: 'published', is_featured: true, description: 'Ride the conveyors, mind the spike plates.' },
  '07': { title: 'Locked Gears',    status: 'published', is_featured: true, description: 'Six keys, four gears, no shortcuts.' },
  '08': { title: 'Open Fire',       status: 'published', is_featured: true, description: 'First cannons of the campaign — keep moving.' },
  '09': { title: 'Long Way Home',   status: 'published', is_featured: true, description: 'Five rooms. Every hazard. One way out.' },
  '10': { title: 'Glass Cathedral', status: 'published', is_featured: true, description: 'Glass everywhere, lasers everywhere. The finale.' },
};

const now = Date.now();
const rows = [];
for (const [n, meta] of Object.entries(META)) {
  const file = resolve(LEVELS_DIR, `level-${n}.json`);
  const data = JSON.parse(await readFile(file, 'utf8'));
  // Stagger fake publish dates so the explore page has natural ordering.
  const publishedAt = meta.status === 'published'
    ? new Date(now - (15 - parseInt(n, 10)) * 86_400_000).toISOString()
    : null;
  rows.push({
    id: `seed${n}`,
    game_type: 'ricochet',
    creator_id: profile.id,
    title: meta.title,
    description: meta.description,
    data,
    status: meta.status,
    is_featured: meta.is_featured,
    published_at: publishedAt,
  });
}

const { error: upsertErr } = await supabase
  .from('levels')
  .upsert(rows, { onConflict: 'id' });

if (upsertErr) {
  console.error('Upsert failed:', upsertErr);
  process.exit(1);
}

console.log(`Upserted ${rows.length} levels (seed01..seed${String(rows.length).padStart(2, '0')}).`);
