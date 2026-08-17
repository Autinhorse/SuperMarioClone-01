"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lets the embedded game hand navigation back to the website.
 *
 * The problem it solves: when the game is launched by a deep link
 * (`?arcade=…`, `?level=…`) the player never saw the game's own front page, so
 * "back" landing on the in-game level picker — and then on the in-game home
 * screen — swaps them into a second, parallel navigation model they can't get
 * out of. They came from a web page; back should return to that web page.
 *
 * The game calls `window.__lcExit()` (looked up on `window.parent`, since it
 * runs in an iframe) and we route. Pairs with `window.__lcSession` in
 * `OriginSession`; the accessor name is the contract between the two repos —
 * game side is `Main._host_exit()`.
 *
 * ⚠️ This is **not** the Ricochet embed model ADR-005 decision 3 rejects. That
 * is about business logic — the publish gate, thumbnails, revision swap — which
 * still lives entirely in the game. All that crosses here is "the player is
 * done"; where to go next is a property of the page, and the game neither knows
 * nor should know URLs like /origin/arcade.
 */
export function OriginHostNav({ backHref }: { backHref: string }) {
  const router = useRouter();

  useEffect(() => {
    window.__lcExit = () => {
      router.push(backHref);
    };
    return () => {
      delete window.__lcExit;
    };
  }, [router, backHref]);

  return null;
}

declare global {
  interface Window {
    __lcExit?: () => void;
  }
}
