// One-shot diagnostic: read seed10's row from Supabase and report what
// shape the `data` column has, so we know whether the playback issue
// is server-side (corrupted/missing data) or client-side (game bug).

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

const { data, error } = await supabase
  .from('levels')
  .select('id, title, status, is_featured, data')
  .eq('id', 'seed10')
  .maybeSingle();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}
if (!data) {
  console.log('No row for seed10.');
  process.exit(0);
}

console.log(`id: ${data.id}`);
console.log(`title: ${data.title}`);
console.log(`status: ${data.status}, featured: ${data.is_featured}`);
const d = data.data;
if (!d || typeof d !== 'object') {
  console.log(`data is ${typeof d}: ${JSON.stringify(d).slice(0, 200)}`);
} else {
  console.log(`data keys: ${Object.keys(d).join(', ')}`);
  console.log(`pages: ${d.pages?.length ?? '?'}`);
  if (d.pages?.length) {
    d.pages.forEach((p, i) => {
      const elementCounts = {};
      for (const k of Object.keys(p)) {
        if (Array.isArray(p[k]) && k !== 'tiles') elementCounts[k] = p[k].length;
      }
      console.log(`  page ${i}: ${p.tiles?.length ?? 0} rows, spawn=${JSON.stringify(p.spawn)}, elements=${JSON.stringify(elementCounts)}`);
    });
  }
  console.log(`exit: ${JSON.stringify(d.exit)}`);
  const sizeChars = JSON.stringify(d).length;
  console.log(`serialized size: ${sizeChars} chars`);
}
