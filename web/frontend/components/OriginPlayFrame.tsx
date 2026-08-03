"use client";

import { useState } from "react";
import { OriginSession } from "@/components/OriginSession";

/** Play a shared Origin level in the browser, without leaving the level page.
 *
 * **The game is not mounted until the visitor asks for it.** The build is
 * ~18 MB; most people who open a shared link want to see what the level *is*
 * first, and forcing the engine on all of them would make every share link
 * feel broken on a phone or a slow connection. Waiting for a click also keeps
 * this page doing the job only a real page can do — server-rendered title,
 * description and thumbnail, so the link previews in chat apps and search
 * engines can index it. A canvas can do neither.
 *
 * The level id travels as a query param on the iframe's own URL; the game
 * reads `location.search` itself (`Main.deep_link_level_id`). Nothing is
 * posted in, so the game keeps owning the whole download → play → rate flow
 * exactly as it does when you pick a level inside the app.
 *
 * The one thing the host does supply is the session (`OriginSession`), so the
 * viewer is already signed in inside the game and can rate without a second
 * login. Anonymous visitors still play fine — plays are counted anonymously.
 */
export function OriginPlayFrame({
  levelId,
  title,
  children,
}: {
  levelId: string;
  title: string;
  children: React.ReactNode;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      // 16:9 is the game's own viewport shape; the still frame above uses 5:3
      // to match the stored thumbnail, so the box changes shape on start.
      <div className="aspect-video w-full rounded-2xl bg-[#22252c] overflow-hidden">
        <OriginSession>
          <iframe
            src={`/origin-web/index.html?level=${encodeURIComponent(levelId)}`}
            title={title}
            className="h-full w-full"
            allow="fullscreen; autoplay; gamepad"
          />
        </OriginSession>
      </div>
    );
  }

  return (
    <div className="relative aspect-[5/3] w-full rounded-2xl bg-[#22252c] overflow-hidden grid place-items-center">
      {children}
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="absolute inset-0 grid place-items-center bg-ink/40 hover:bg-ink/25 transition-colors"
        aria-label={`Play ${title}`}
      >
        <span className="rounded-2xl border-2 border-ink bg-brand-yellow px-6 py-3 font-display font-bold text-lg shadow-[4px_4px_0_0_var(--color-ink)]">
          ▶ Play in browser
        </span>
      </button>
    </div>
  );
}
