"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const NS = "ricochet:";

type IncomingMsg =
  | { type: "ricochet:ready"; levelId: string }
  | { type: "ricochet:play-started"; levelId: string }
  | { type: "ricochet:level-completed"; levelId: string };

// Iframe + website-side end-of-level overlay. Same postMessage protocol
// as GameFrame on /ricochet/play/[id], plus three flow buttons:
//   Replay     — bumps a key on the iframe to force a clean reload
//   Next →     — router.push to /ricochet/campaign/{n+1} (last level
//                instead routes back to /ricochet)
//   Back to Hub — router.push to /ricochet
//
// The overlay sits as an absolutely-positioned card with a dimmed
// backdrop covering the whole iframe area, so the in-game "Play again"
// dialog stays hidden behind it. We never use the campaign-mode
// PlayScene path (which has its own Exit-to-MenuScene flow inside the
// iframe) — every transition is website-driven.
export function CampaignFrame({
  levelId,
  levelData,
  n,
  totalLevels,
}: {
  levelId: string;
  levelData: unknown;
  n: number;
  totalLevels: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const router = useRouter();
  const [completed, setCompleted] = useState(false);
  // Bumped by the Replay button to force a fresh iframe mount, which
  // is the cheapest way to restart the level from scratch (sound
  // manager, scene state, all reset). PlayScene supports an in-iframe
  // restart too but reaching it would require a postMessage protocol
  // we don't currently have.
  const [iframeKey, setIframeKey] = useState(0);

  const isLast = n >= totalLevels;
  const nextHref = isLast ? "/ricochet" : `/ricochet/campaign/${n + 1}`;

  useEffect(() => {
    function handleMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as IncomingMsg | null;
      if (!data || typeof data !== "object" || !data.type?.startsWith(NS))
        return;
      if (data.levelId !== levelId) return;

      if (data.type === "ricochet:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: NS + "level", levelId, data: levelData },
          window.location.origin,
        );
        return;
      }

      if (data.type === "ricochet:play-started") {
        // Same fire-and-forget play count as GameFrame.
        void fetch(`/api/levels/${encodeURIComponent(levelId)}/play`, {
          method: "POST",
        });
        return;
      }

      if (data.type === "ricochet:level-completed") {
        // Public clear count — campaign plays count toward the level's
        // stats just like a standalone /play visit does.
        void fetch(`/api/levels/${encodeURIComponent(levelId)}/clear`, {
          method: "POST",
        });
        setCompleted(true);
        return;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [levelId, levelData]);

  function onReplay() {
    setCompleted(false);
    setIframeKey((k) => k + 1);
  }

  function onNext() {
    router.push(nextHref);
  }

  function onHub() {
    router.push("/ricochet");
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={`/games/ricochet/index.html?mode=play&levelId=${encodeURIComponent(levelId)}`}
        title={`Ricochet level ${n} of ${totalLevels}`}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; gamepad"
      />
      {completed && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-ink/60 p-6">
          <div className="rounded-3xl border-2 border-ink bg-paper p-6 lg:p-8 shadow-[6px_6px_0_0_var(--color-ink)] max-w-md w-full text-center">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-ink/60 mb-2">
              {isLast ? "Campaign complete" : `Level ${n} cleared`}
            </p>
            <h2 className="font-display font-bold text-3xl mb-3">
              {isLast ? "🎉 You finished it!" : "Level cleared ✓"}
            </h2>
            <p className="text-sm text-ink/70 mb-6">
              {isLast
                ? `You cleared all ${totalLevels} levels of the Ricochet campaign.`
                : `On to Level ${n + 1}.`}
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <ModalButton onClick={onReplay} variant="ghost">
                Replay
              </ModalButton>
              {!isLast && (
                <ModalButton onClick={onNext} variant="primary">
                  Next level →
                </ModalButton>
              )}
              <ModalButton onClick={onHub} variant="ghost">
                Back to hub
              </ModalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalButton({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "primary" | "ghost";
}) {
  const base =
    "px-4 h-10 rounded-full border-2 border-ink font-display font-semibold text-sm shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition";
  const variantClass = variant === "primary" ? "bg-brand-yellow" : "bg-white";
  return (
    <button type="button" onClick={onClick} className={`${base} ${variantClass}`}>
      {children}
    </button>
  );
}
