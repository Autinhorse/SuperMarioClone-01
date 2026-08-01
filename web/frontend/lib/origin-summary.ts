// A few honest facts read out of an Origin level payload.
//
// Origin levels can't be played in the browser (Godot desktop app, no web
// export deployed), so their level page has no game frame — this is what
// fills that space instead: how big the level is, what it's made of, and
// which rules the author turned on.
//
// The shape comes from `runtime/level/level_codec.gd` in the game repo:
// grid cells are parallel arrays (thousands of them, so compactness wins),
// objects are records with a `type` field. The codec's own comment says the
// platform is meant to scan `type` to see which elements a level uses —
// that's exactly what `elements` below does.
//
// Everything here is permissive: `levels.data` is opaque jsonb the platform
// never validates, so every field is probed and skipped when it's missing or
// the wrong type. A malformed payload yields nulls, never a throw.

export type OriginSummary = {
  areaCount: number;
  cellCount: number;
  objectCount: number;
  /** Distinct object type ids, most-used first (e.g. "walker", "spike"). */
  elements: Array<{ type: string; count: number }>;
  /** Author-set rules, already formatted for display. Empty when the level
   *  uses nothing but the defaults. */
  rules: string[];
};

const AUTO_SCROLL_DIRS = ["", "right", "left", "up", "down"];
const PARKOUR_DIRS = ["", "right", "left"];

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// `fallback` must match the game's own default for that key (LevelCodec.DEFAULTS)
// — a missing key means "the author never touched it", not "it's zero". Getting
// this wrong on `lives` printed "Unlimited lives" for a level that actually has
// the standard three.
function num(source: Record<string, unknown>, key: string, fallback = 0): number {
  const v = source[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function arrayLen(source: Record<string, unknown> | null, key: string): number {
  if (!source) return 0;
  const v = source[key];
  return Array.isArray(v) ? v.length : 0;
}

export function summarizeOriginLevel(data: unknown): OriginSummary | null {
  const d = obj(data);
  if (!d) return null;
  const areas = Array.isArray(d.areas) ? d.areas : null;
  if (!areas) return null;

  let cellCount = 0;
  let objectCount = 0;
  const byType = new Map<string, number>();

  for (const rawArea of areas) {
    const area = obj(rawArea);
    if (!area) continue;
    // Cell count = length of any one parallel array; `x` is always written.
    cellCount += arrayLen(obj(area.cells), "x");
    const objects = Array.isArray(area.objects) ? area.objects : [];
    objectCount += objects.length;
    for (const rawObject of objects) {
      const record = obj(rawObject);
      const type = record && typeof record.type === "string" ? record.type : "";
      if (type) byType.set(type, (byType.get(type) ?? 0) + 1);
    }
  }

  const elements = [...byType.entries()]
    .map(([type, count]) => ({ type, count }))
    // Ties broken by name so the list is stable between renders of the same
    // level (Map iteration order is insertion order, i.e. level layout order).
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const rules: string[] = [];
  const timeLimit = num(d, "time_limit");
  if (timeLimit > 0) rules.push(`${Math.round(timeLimit)}s time limit`);
  // 0 means "lives aren't counted"; 3 is the default, worth stating only
  // when the author moved it (hence the fallback — see `num`).
  const lives = num(d, "lives", 3);
  if (lives === 0) rules.push("Unlimited lives");
  else if (lives !== 3) rules.push(`${lives} lives`);
  const gems = num(d, "require_gems");
  if (gems > 0) rules.push(`${gems} gems to finish`);
  const stars = num(d, "require_stars");
  if (stars > 0) rules.push(`${stars} stars to finish`);
  const kills = num(d, "require_kills");
  if (kills > 0) rules.push(`${kills} enemies to defeat`);
  const scroll = num(d, "auto_scroll_dir");
  if (scroll > 0 && scroll < AUTO_SCROLL_DIRS.length) {
    rules.push(`Auto-scrolls ${AUTO_SCROLL_DIRS[scroll]}`);
  }
  const parkour = num(d, "parkour_dir");
  if (parkour > 0 && parkour < PARKOUR_DIRS.length) {
    rules.push(`Auto-run ${PARKOUR_DIRS[parkour]} (jump only)`);
  }

  return {
    areaCount: areas.length,
    cellCount,
    objectCount,
    elements,
    rules,
  };
}
