import type { PreviewPage } from "@/lib/level-preview";

// Compact SVG preview of a level (page 0 only). Each tile is one viewBox
// unit; aspect is preserved with `meet` so the level letterboxes inside
// whatever container shape it lands in. Shapes here are deliberately
// simplified — the goal is a recognizable silhouette, not a rendered
// game frame. Element colors mirror the in-game palette from
// games/ricochet/src/game/config/feel.ts (kept in sync by hand for now).

// Color palette — duplicated from games/ricochet/src/game/config/feel.ts.
const C = {
  paper: "#f7f4ec",
  wall: "#73757f",
  coin: "#ffd933",
  spike: "#d84040",
  glass: "#8cd9ff",
  conveyor: "#666c8c",
  cannon: "#4d4d52",
  laserHub: "#ff3333",
  gear: "#999999",
  teleport: "#f28c33",
  exit: "#66d973",
  player: "#4ca6ff",
} as const;

const KEY_LIGHT = [
  "#f24c4c", // red
  "#f29933", // orange
  "#f2e633", // yellow
  "#4cd959", // green
  "#33bff2", // cyan
  "#b366f2", // purple
];

// 70%-darkened key colors for key_walls (matches KEY_COLORS_DARK in feel.ts).
const KEY_DARK = ["#a93535", "#a96b24", "#a9a124", "#359739", "#2486a9", "#7d48a9"];

function safeKeyColor(idx: number, palette: string[]): string {
  return palette[((idx % palette.length) + palette.length) % palette.length] ?? palette[0]!;
}

export function LevelThumb({ page }: { page: PreviewPage | null }) {
  if (!page) {
    return <FallbackTexture />;
  }
  const rows = page.tiles.length;
  const cols = page.tiles[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return <FallbackTexture />;
  }

  // Walls + coins from the tile string. Single pass; emits nodes into
  // separate arrays so coins draw on top of walls in render order.
  const walls: React.ReactNode[] = [];
  const coins: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const row = page.tiles[r] ?? "";
    for (let c = 0; c < row.length && c < cols; c++) {
      const ch = row.charAt(c);
      if (ch === "W") {
        walls.push(<rect key={`w${r}-${c}`} x={c} y={r} width={1} height={1} fill={C.wall} />);
      } else if (ch === "C") {
        coins.push(
          <circle key={`c${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r={0.28} fill={C.coin} />,
        );
      }
    }
  }

  // Element overlays — order chosen so big background-y things draw
  // first and small markers (spawn/exit/keys) render on top.
  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full block"
      style={{ backgroundColor: C.paper }}
      aria-hidden
    >
      {walls}

      {page.glass_walls?.map((g, i) => (
        <rect
          key={`gl${i}`}
          x={g.x}
          y={g.y}
          width={1}
          height={1}
          fill={C.glass}
          opacity={0.7}
        />
      ))}

      {page.conveyors?.map((cv, i) => (
        <g key={`cv${i}`}>
          <rect x={cv.x} y={cv.y} width={1} height={1} fill={C.conveyor} opacity={0.7} />
          <rect x={cv.x + 0.1} y={cv.y + 0.4} width={0.8} height={0.2} fill="#fff" opacity={0.5} />
        </g>
      ))}

      {page.key_walls?.map((kw, i) => (
        <rect
          key={`kw${i}`}
          x={kw.x}
          y={kw.y}
          width={1}
          height={1}
          fill={safeKeyColor(kw.color, KEY_DARK)}
          opacity={0.85}
        />
      ))}

      {page.spike_blocks?.map((sb, i) => (
        <rect
          key={`sb${i}`}
          x={sb.x + 0.1}
          y={sb.y + 0.1}
          width={0.8}
          height={0.8}
          fill={C.spike}
        />
      ))}

      {/* Directional spikes — small chevron-ish triangle pointing in `dir`.
          Falls back to a centered red square when dir is missing. */}
      {page.spikes?.map((s, i) => {
        const cx = s.x + 0.5;
        const cy = s.y + 0.5;
        let pts: string;
        switch (s.dir) {
          case "up":
            pts = `${s.x + 0.1},${s.y + 0.9} ${cx},${s.y + 0.1} ${s.x + 0.9},${s.y + 0.9}`;
            break;
          case "down":
            pts = `${s.x + 0.1},${s.y + 0.1} ${cx},${s.y + 0.9} ${s.x + 0.9},${s.y + 0.1}`;
            break;
          case "left":
            pts = `${s.x + 0.9},${s.y + 0.1} ${s.x + 0.1},${cy} ${s.x + 0.9},${s.y + 0.9}`;
            break;
          case "right":
            pts = `${s.x + 0.1},${s.y + 0.1} ${s.x + 0.9},${cy} ${s.x + 0.1},${s.y + 0.9}`;
            break;
          default:
            return (
              <rect
                key={`sp${i}`}
                x={s.x + 0.2}
                y={s.y + 0.2}
                width={0.6}
                height={0.6}
                fill={C.spike}
              />
            );
        }
        return <polygon key={`sp${i}`} points={pts} fill={C.spike} />;
      })}

      {page.cannons?.map((cn, i) => (
        <g key={`cn${i}`}>
          <rect x={cn.x} y={cn.y} width={1} height={1} fill={C.cannon} />
          <circle cx={cn.x + 0.5} cy={cn.y + 0.5} r={0.18} fill={C.spike} />
        </g>
      ))}
      {page.turrets?.map((t, i) => (
        <g key={`tu${i}`}>
          <rect x={t.x} y={t.y} width={1} height={1} fill={C.cannon} />
          <circle cx={t.x + 0.5} cy={t.y + 0.5} r={0.18} fill={C.coin} />
        </g>
      ))}
      {page.laser_cannons?.map((lc, i) => (
        <g key={`lc${i}`}>
          <rect x={lc.x} y={lc.y} width={1} height={1} fill={C.cannon} />
          <circle cx={lc.x + 0.5} cy={lc.y + 0.5} r={0.18} fill={C.laserHub} />
        </g>
      ))}

      {page.gears?.map((g, i) => {
        const size = g.size ?? 2;
        const r = size * 0.42;
        return (
          <circle
            key={`gr${i}`}
            cx={g.x + 0.5}
            cy={g.y + 0.5}
            r={r}
            fill="none"
            stroke={C.gear}
            strokeWidth={0.18}
          />
        );
      })}

      {page.portals?.flatMap((p, i) =>
        p.points.map((pt, j) => (
          <circle
            key={`po${i}-${j}`}
            cx={pt.x + 0.5}
            cy={pt.y + 0.5}
            r={0.32}
            fill={safeKeyColor(p.color, KEY_LIGHT)}
            opacity={0.85}
          />
        )),
      )}

      {page.teleports?.map((tp, i) => (
        <circle
          key={`tp${i}`}
          cx={tp.x + 0.5}
          cy={tp.y + 0.5}
          r={0.32}
          fill="none"
          stroke={C.teleport}
          strokeWidth={0.16}
        />
      ))}

      {coins}

      {page.keys?.map((k, i) => (
        <rect
          key={`k${i}`}
          x={k.x + 0.25}
          y={k.y + 0.25}
          width={0.5}
          height={0.5}
          fill={safeKeyColor(k.color, KEY_LIGHT)}
        />
      ))}

      {/* Spawn — small filled disc in the player's color. */}
      <circle cx={page.spawn.x + 0.5} cy={page.spawn.y + 0.5} r={0.3} fill={C.player} />

      {/* Exit — green ring; only shown when the level's exit is on page 0. */}
      {page.exit && (
        <rect
          x={page.exit.x + 0.05}
          y={page.exit.y + 0.05}
          width={0.9}
          height={0.9}
          fill="none"
          stroke={C.exit}
          strokeWidth={0.18}
        />
      )}
    </svg>
  );
}

// Used both when there's no page data AND as a graceful empty state if
// extraction fails. Keeps the old colored-grid look so cards never
// collapse into nothing.
function FallbackTexture() {
  return (
    <div
      className="w-full h-full"
      style={{
        backgroundColor: "#A5D6A7",
        backgroundImage:
          "linear-gradient(to right, rgba(26,27,46,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,27,46,0.15) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    />
  );
}
