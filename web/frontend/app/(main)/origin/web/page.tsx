import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OriginSession } from "@/components/OriginSession";

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
// and the parent hands in the session (ADR-005 decision 2, `OriginSession`) so
// there is exactly one identity per browser.
//
// `?mode=edit` is passed straight through to the build, which boots into the
// editor instead of the front page (`Main.deep_link_mode`). That is what the
// hub's "Build your own" button links to.
export default async function OriginWebPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  // Whitelist rather than forward: the query string is user input, and the
  // build only understands this one value.
  const src =
    mode === "edit" ? "/origin-web/index.html?mode=edit" : "/origin-web/index.html";

  // The sign-in sentence has to match reality. Claiming "you're already signed
  // in" at an anonymous visitor is worse than saying nothing: it reads as a bug
  // when the game then shows them a Log in button. (Caught in the e2e shot.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="px-4 pt-6 space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display font-bold text-2xl">Origin — in your browser</h1>
        <Link href="/origin" className="underline underline-offset-2 text-sm">
          back to Origin
        </Link>
      </header>

      <p className="text-base leading-snug max-w-2xl">
        This is the same game as the desktop build, running in a browser.{" "}
        {user ? (
          <>You are signed in with your LevelCraft account already — no second login.</>
        ) : (
          <>
            You can play and build straight away;{" "}
            <Link href="/login?next=/origin/web" className="underline underline-offset-2">
              sign in
            </Link>{" "}
            when you want to publish.
          </>
        )}{" "}
        It is still a demo: levels you build here are saved in{" "}
        <em>this browser</em> only until you publish them.
      </p>

      {/* 16:9 to match the game's own viewport model (`view_tiles_v` + fixed
          16:9, see docs/ScreenAndUIDesign.md). Any other ratio just letterboxes
          inside the canvas, so give it the shape it wants. */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl border-2 border-ink bg-ink shadow-[6px_6px_0_0_var(--color-ink)]">
        <OriginSession>
          <iframe
            src={src}
            title="LevelCraft Origin"
            className="absolute inset-0 h-full w-full"
            // The canvas wants the keyboard (arrows, space, E) and full-screen.
            allow="fullscreen; autoplay; gamepad"
          />
        </OriginSession>
      </div>

      <p className="text-sm opacity-70 max-w-2xl">
        First load pulls about 16&nbsp;MB of engine and assets — it is cached
        afterwards. If nothing appears, your browser needs WebGL&nbsp;2.
      </p>
    </div>
  );
}
