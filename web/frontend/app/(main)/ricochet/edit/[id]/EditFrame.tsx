"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePublishCtx } from "@/components/PublishProvider";

const NS = "ricochet:";

type IncomingMsg =
  | { type: "ricochet:ready"; levelId: string }
  | { type: "ricochet:level-saved"; levelId: string; data: unknown }
  | { type: "ricochet:exit-edit"; levelId: string }
  | { type: "ricochet:level-cleared"; levelId: string };

// Hosts the embedded Phaser editor. Bridges its postMessage protocol
// to the platform: pushes the current level data when asked, and on
// save calls the PUT /api/levels/[id] endpoint, then echoes the result
// back to the game so the editor can flash success / show an error.
//
// Same-origin only — the build is served from /games/ricochet/ on the
// same domain as this app, so we accept messages whose origin matches
// window.location.origin and ignore everything else.
//
// Also owns the iframe ref for the publish-verify flow: registers an
// imperative starter with EditCtx so PublishToggle's modal can post
// `ricochet:start-publish-verify` into the iframe without lifting the
// ref higher up the tree.
export function EditFrame({
  levelId,
  levelData,
}: {
  levelId: string;
  levelData: unknown;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const router = useRouter();
  const { markDirty, markCleared, registerVerifyStarter } = usePublishCtx();

  useEffect(() => {
    const unregister = registerVerifyStarter(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: NS + "start-publish-verify", levelId },
        window.location.origin,
      );
    });
    return unregister;
  }, [levelId, registerVerifyStarter]);

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

      if (data.type === "ricochet:exit-edit") {
        // Editor's "Done" button pressed (and any unsaved-changes
        // confirm already resolved inside the iframe). Mirror the page
        // header's back link — return to the level's play page.
        router.push(`/ricochet/play/${encodeURIComponent(levelId)}`);
        return;
      }

      if (data.type === "ricochet:level-cleared") {
        // Player just cleared the level via a publish-verify run. Stamp
        // last_cleared_at server-side and flip the gate locally so
        // PublishToggle can advance from the verify modal to the
        // confirm-publish step. We don't surface mark-cleared errors —
        // a failed roundtrip just means the next Publish click re-runs
        // the test (annoying but safe).
        try {
          const res = await fetch(
            `/api/levels/${encodeURIComponent(levelId)}/mark-cleared`,
            { method: "POST" },
          );
          if (res.ok) markCleared();
        } catch {
          // swallow — see comment above.
        }
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
          // Save succeeded → server bumped updated_at, so the playtest
          // gate is now stale (last_cleared_at < updated_at). Reflect
          // that in local state so PublishToggle re-disables instantly.
          markDirty();
          postSaveResult(true);
        } catch (err) {
          postSaveResult(false, (err as Error).message);
        }
        return;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [levelId, levelData, router, markDirty, markCleared]);

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
