"use client";

import { useEffect, useRef } from "react";

const NS = "ricochet:";

type IncomingMsg =
  | { type: "ricochet:ready"; levelId: string }
  | { type: "ricochet:level-saved"; levelId: string; data: unknown };

// Hosts the embedded Phaser editor. Bridges its postMessage protocol
// to the platform: pushes the current level data when asked, and on
// save calls the PUT /api/levels/[id] endpoint, then echoes the result
// back to the game so the editor can flash success / show an error.
//
// Same-origin only — the build is served from /games/ricochet/ on the
// same domain as this app, so we accept messages whose origin matches
// window.location.origin and ignore everything else.
export function EditFrame({
  levelId,
  levelData,
}: {
  levelId: string;
  levelData: unknown;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function postSaveResult(ok: boolean, error?: string) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: NS + "save-result", levelId, ok, error },
        window.location.origin,
      );
    }

    async function handleMessage(ev: MessageEvent) {
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

      if (data.type === "ricochet:level-saved") {
        try {
          const res = await fetch(
            `/api/levels/${encodeURIComponent(levelId)}`,
            {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ data: data.data }),
            },
          );
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            postSaveResult(false, err.error ?? `HTTP ${res.status}`);
            return;
          }
          postSaveResult(true);
        } catch (err) {
          postSaveResult(false, (err as Error).message);
        }
        return;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [levelId, levelData]);

  return (
    <iframe
      ref={iframeRef}
      src={`/games/ricochet/index.html?mode=edit&levelId=${encodeURIComponent(levelId)}`}
      title="Ricochet editor"
      className="w-full h-full border-0"
      allow="autoplay; fullscreen; gamepad"
    />
  );
}
