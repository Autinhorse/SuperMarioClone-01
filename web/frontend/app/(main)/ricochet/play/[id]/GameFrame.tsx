"use client";

import { useEffect, useRef } from "react";
import { usePublishCtxOptional } from "@/components/PublishProvider";

const NS = "ricochet:";

type IncomingMsg =
  | { type: "ricochet:ready"; levelId: string }
  | { type: "ricochet:play-started"; levelId: string }
  | { type: "ricochet:level-completed"; levelId: string };

// Hosts the embedded Phaser build and bridges its postMessage protocol
// to the platform: pushes level data into the iframe when it asks for
// it, and pings the play/clear count endpoints on lifecycle events.
//
// Same-origin only — the game build is served from /games/ricochet/ on
// the same domain as this app, so we accept messages whose origin
// matches window.location.origin and ignore everything else.
//
// When the viewer is the level's creator (`isOwner`), a successful
// natural play-through also satisfies the publish-verify gate. We POST
// mark-cleared in addition to the public /clear counter, and flip the
// shared PublishCtx so the PublishToggle in the header can advance to
// "Test passed ✓ Publish?" without a refresh.
export function GameFrame({
  levelId,
  levelData,
  isOwner,
}: {
  levelId: string;
  levelData: unknown;
  isOwner: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const publishCtx = usePublishCtxOptional();

  useEffect(() => {
    function handleMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as IncomingMsg | null;
      if (!data || typeof data !== "object" || !data.type?.startsWith(NS)) return;
      if (data.levelId !== levelId) return;

      if (data.type === "ricochet:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: NS + "level", levelId, data: levelData },
          window.location.origin,
        );
        return;
      }

      if (data.type === "ricochet:play-started") {
        // Fire-and-forget — count failures shouldn't disrupt gameplay.
        void fetch(`/api/levels/${encodeURIComponent(levelId)}/play`, { method: "POST" });
        return;
      }

      if (data.type === "ricochet:level-completed") {
        void fetch(`/api/levels/${encodeURIComponent(levelId)}/clear`, { method: "POST" });
        // Owner-only: satisfy the publish gate too. The mark-cleared
        // endpoint is creator-scoped via RLS, so a non-owner POST
        // would noop anyway — we just skip the request to keep play
        // pages quiet for everyone else.
        if (isOwner) {
          void fetch(
            `/api/levels/${encodeURIComponent(levelId)}/mark-cleared`,
            { method: "POST" },
          ).then((res) => {
            if (res.ok) publishCtx?.markCleared();
          });
        }
        return;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [levelId, levelData, isOwner, publishCtx]);

  return (
    <iframe
      ref={iframeRef}
      src={`/games/ricochet/index.html?mode=play&levelId=${encodeURIComponent(levelId)}`}
      title="Ricochet"
      className="w-full h-full border-0"
      allow="autoplay; fullscreen; gamepad"
    />
  );
}
