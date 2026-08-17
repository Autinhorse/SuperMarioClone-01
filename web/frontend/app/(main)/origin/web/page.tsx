import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OriginSession } from "@/components/OriginSession";
import { OriginHostNav } from "@/components/OriginHostNav";

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
  searchParams: Promise<{ mode?: string; arcade?: string }>;
}) {
  const { mode, arcade } = await searchParams;
  // Whitelist rather than forward — the query string is user input.
  //
  // `arcade` can't be enumerated (there will be 100+ slugs), so it's sanitised
  // to the character class a slug is allowed to use instead. The game does the
  // same check again on its side and just shows its front page for a slug it
  // doesn't recognise, so a bogus value is harmless either way.
  const slug = (arcade ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  let src = "/origin-web/index.html";
  if (mode === "edit") src += "?mode=edit";
  else if (slug) src += `?arcade=${encodeURIComponent(slug)}`;

  // The sign-in sentence has to match reality. Claiming "you're already signed
  // in" at an anonymous visitor is worse than saying nothing: it reads as a bug
  // when the game then shows them a Log in button. (Caught in the e2e shot.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Where "back" goes — for the in-game exit (OriginHostNav) and for the link
  // in the header. An arcade launch came from the arcade page; anything else
  // came from the Origin hub.
  const backHref = slug ? "/origin/arcade" : "/origin";
  const backLabel = slug ? "← Back to Arcade" : "← Back to Origin";

  return (
    <div className="px-4 pt-6 space-y-4">
      <OriginHostNav backHref={backHref} />
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display font-bold text-2xl">Origin — in your browser</h1>
        {/* Always present, outside the canvas. The in-game exit needs the game
            to be running and to have booted far enough to call out; this link
            works even if the wasm never loads. */}
        <Link href={backHref} className="underline underline-offset-2 text-sm">
          {backLabel}
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
