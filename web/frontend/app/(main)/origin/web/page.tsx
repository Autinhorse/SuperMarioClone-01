import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Play Origin in your browser — LevelCraft",
  description:
    "Try LevelCraft Origin without installing anything: play community levels and open the level editor, straight in the browser.",
};

// The build itself is a Godot Web export living in `public/origin-web/`. It is
// rendered in a same-origin iframe rather than inlined, for one reason: Godot
// ships its own HTML shell (canvas sizing, wasm bootstrap, audio worklets) and
// reimplementing that here would mean re-deriving it on every engine upgrade.
//
// ⚠️ This is **not** the Ricochet embed model that ADR-005 rejects. That
// rejection is about *where the logic lives* — Ricochet's host page holds the
// session and feeds the game level data over postMessage, so the publish gate,
// thumbnails and republish-swap would have to be reimplemented outside the
// game. Here the game keeps all of it and calls `/api/v1/*` itself; the iframe
// is only a frame. Same-origin is what makes both true: no CORS on the API,
// and the parent can hand a session in later (ADR-005 decision 2, still to do).
export default function OriginWebPage() {
  return (
    <div className="px-4 pt-6 space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display font-bold text-2xl">Origin — in your browser</h1>
        <Link href="/origin" className="underline underline-offset-2 text-sm">
          back to Origin
        </Link>
      </header>

      <p className="text-base leading-snug max-w-2xl">
        This is the same game as the desktop build, running in a browser. It is a
        demo: your levels are saved in <em>this browser</em> only, and signing in
        here is separate from the site for now.
      </p>

      {/* 16:9 to match the game's own viewport model (`view_tiles_v` + fixed
          16:9, see docs/ScreenAndUIDesign.md). Any other ratio just letterboxes
          inside the canvas, so give it the shape it wants. */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl border-2 border-ink bg-ink shadow-[6px_6px_0_0_var(--color-ink)]">
        <iframe
          src="/origin-web/index.html"
          title="LevelCraft Origin"
          className="absolute inset-0 h-full w-full"
          // The canvas wants the keyboard (arrows, space, E) and full-screen.
          allow="fullscreen; autoplay; gamepad"
        />
      </div>

      <p className="text-sm opacity-70 max-w-2xl">
        First load pulls about 56&nbsp;MB of engine and assets — it is cached
        afterwards. If nothing appears, your browser needs WebGL&nbsp;2.
      </p>
    </div>
  );
}
