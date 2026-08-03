"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Hands the browser's Supabase session to the embedded Origin build.
 *
 * ADR-005 decision 2: one sign-in on levelcraft.gg is the sign-in inside the
 * game. The build is a same-origin iframe of the *same* Godot project that
 * ships on desktop — it calls `/api/v1/*` itself and owns the publish gate,
 * thumbnails and `swappedToId` handling. The only thing it can't do in a
 * browser is mint its own identity, because that would be a second one.
 *
 * So the host exposes a synchronous read point and the game pulls:
 *
 *     window.__lcSession()  →  '{"access_token":…,"expires_at":…,"user":{…}}' | null
 *
 * **Pull, not push.** `AccountService` is a static-coroutine class on the game
 * side; `await`-ing a value is one line, whereas receiving a postMessage needs
 * a mailbox and a ready state. It also makes token expiry free: "ask again"
 * is the same code path as "ask the first time".
 *
 * ⚠️ **access_token only — never the refresh token.** Supabase rotates refresh
 * tokens: whoever spends one invalidates the other copy. If supabase-js here
 * and `AccountService.refresh()` in the wasm both held one, they would knock
 * each other out about an hour in, surfacing as "I was playing and suddenly
 * got signed out". Refreshing stays exclusively ours; the game re-reads.
 *
 * Mirror of `runtime/net/host_session.gd` in the game repo — the accessor name
 * is the contract between them.
 */

type HostSession = {
  access_token: string;
  expires_at: number;
  user: unknown;
};

declare global {
  interface Window {
    __lcSession?: () => string | null;
  }
}

export function OriginSession({ children }: { children: React.ReactNode }) {
  // The iframe only renders once the accessor is installed. The game retries
  // for ~1s on its side, so this is belt-and-braces rather than load-bearing —
  // but mounting the 39 MB wasm before the session exists is a real race we
  // can simply not have.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let current: HostSession | null = null;

    window.__lcSession = () => (current ? JSON.stringify(current) : null);

    function adopt(session: {
      access_token: string;
      expires_at?: number;
      user: unknown;
    } | null) {
      current = session
        ? {
            access_token: session.access_token,
            // supabase-js gives absolute seconds; the game turns it back into a
            // duration. Missing (shouldn't happen) → 0, which the game reads as
            // "expired" and simply asks again.
            expires_at: session.expires_at ?? 0,
            user: session.user,
          }
        : null;
    }

    // ⚠️ Arm the iframe **whatever happens to this call**. Playing does not need
    // a session (plays are counted anonymously), so a Supabase outage must cost
    // the visitor their sign-in — never the game itself. Gating the mount on a
    // successful getSession() would turn any auth hiccup into a permanently
    // blank player, which is the worse failure by a wide margin.
    //
    // The timeout is not paranoia: a dead network hangs rather than rejects, so
    // catch() alone would still leave the page stuck on "Loading…" forever.
    // (Observed while testing against a local stack whose port forwarding had
    // dropped — requests neither completed nor failed.)
    let settled = false;
    const arm = () => {
      if (settled) return;
      settled = true;
      setArmed(true);
    };
    const timer = setTimeout(arm, 3000);

    supabase.auth
      .getSession()
      .then(({ data }) => adopt(data.session))
      .catch(() => adopt(null))
      .finally(() => {
        clearTimeout(timer);
        arm();
      });

    // Covers sign-in, sign-out and — the one that matters most — TOKEN_REFRESHED.
    // The game keeps calling the same accessor, so a refresh here is picked up
    // the next time its token goes stale. Nothing to notify.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      adopt(session);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      delete window.__lcSession;
    };
  }, []);

  if (!armed) {
    return (
      <div className="grid h-full w-full place-items-center text-sm text-paper/60">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
