import { promises as fs } from "fs";
import path from "path";

// Devlog entries are authored as Markdown files in `content/devlog/`, one
// file per post. Each file starts with a small YAML-ish frontmatter block:
//
//   ---
//   title: My "AI Dev Team" & Tech Stack
//   date: 2026-06-30
//   tag: Week 01 · Day 0
//   summary: One-line teaser shown in the list.
//   ---
//   <markdown body...>
//
// We hand-parse the frontmatter (the format is fully under our control, so a
// full YAML dependency would be overkill). To publish a new entry, drop a new
// `.md` file in that directory — nothing else needs to change.

const DEVLOG_DIR = path.join(process.cwd(), "content", "devlog");

export type DevlogMeta = {
  slug: string;
  title: string;
  date: string; // ISO date, e.g. "2026-06-30"
  tag?: string;
  summary?: string;
};

export type DevlogEntry = DevlogMeta & {
  body: string; // raw markdown
};

type Frontmatter = Record<string, string>;

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // Strip a single layer of surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }
  return { data, body: match[2] };
}

async function readEntry(slug: string): Promise<DevlogEntry | null> {
  try {
    const raw = await fs.readFile(path.join(DEVLOG_DIR, `${slug}.md`), "utf8");
    const { data, body } = parseFrontmatter(raw);
    if (!data.title || !data.date) return null;
    return {
      slug,
      title: data.title,
      date: data.date,
      tag: data.tag,
      summary: data.summary,
      body: body.trim(),
    };
  } catch {
    return null;
  }
}

/** All entries, newest first. */
export async function getDevlogEntries(): Promise<DevlogMeta[]> {
  let files: string[];
  try {
    files = await fs.readdir(DEVLOG_DIR);
  } catch {
    return [];
  }

  const slugs = files
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));

  const entries = (await Promise.all(slugs.map(readEntry))).filter(
    (e): e is DevlogEntry => e !== null,
  );

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return entries.map(
    ({ slug, title, date, tag, summary }): DevlogMeta => ({
      slug,
      title,
      date,
      tag,
      summary,
    }),
  );
}

/** A single entry by slug, or null if it doesn't exist. */
export async function getDevlogEntry(slug: string): Promise<DevlogEntry | null> {
  return readEntry(slug);
}

/** Format an ISO date as e.g. "June 30, 2026". */
export function formatDevlogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
