"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePublishCtx } from "@/components/PublishProvider";

// Modal stages for the publish flow:
//
//   verify-prompt   — pre-test prompt when the user clicks Publish on
//                     a stale draft (edit page only). Confirms the
//                     user wants to start a full playthrough now.
//   verify-passed   — auto-pops after a successful clear (transition
//                     of needsPlaytest from true → false). Asks the
//                     user whether to publish now that the gate is
//                     unlocked.
//   confirm-publish — direct confirm pane when needsPlaytest is already
//                     false at click time (republishing without edits,
//                     or grandfathered seed levels).
//   explainer       — natural-verify mode only (play page): "Play this
//                     level to the exit to verify before publishing."
//   closed          — no modal.
//
// Note: there is intentionally no "verify-running" stage. Once the
// user accepts the verify-prompt, the modal closes and the playthrough
// runs in the iframe with no overlay; the verify-passed modal pops by
// itself when the clear lands.
type Stage =
  | "closed"
  | "verify-prompt"
  | "verify-passed"
  | "confirm-publish"
  | "explainer";

// Editor / play-page header control for the draft↔published transition.
// State is shared with EditFrame / GameFrame via PublishCtx so the
// verify-passed modal can react to level-cleared events posted by the
// embedded game. The set_published_at DB trigger handles the timestamp
// on the first draft→published flip.
export function PublishToggle({ levelId }: { levelId: string }) {
  const {
    status,
    needsPlaytest,
    setStatus,
    startVerify,
    canForceVerify,
  } = usePublishCtx();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("closed");
  const prevNeedsRef = useRef(needsPlaytest);

  // Detect the true → false transition: a clear just landed (either
  // via the editor's force-verify path or via natural play). Auto-pop
  // the confirm-publish modal so the user can ship in one click.
  // Initial mount is a no-op (prevNeedsRef seeded from initial state),
  // and dirty→clean→dirty bounces only ever fire on real transitions.
  useEffect(() => {
    if (prevNeedsRef.current && !needsPlaytest && status === "draft") {
      setStage("verify-passed");
      setError(null);
    }
    prevNeedsRef.current = needsPlaytest;
  }, [needsPlaytest, status]);

  async function patchStatus(next: "draft" | "published"): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/levels/${encodeURIComponent(levelId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        swappedToId?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return false;
      }
      // Revision-swap path: the row we just published was a fork; the
      // server merged its content into the parent and deleted the fork.
      // Continuing to render the editor for a row that no longer exists
      // would 404 on the next save, so navigate to the parent's play
      // page (the published version with the user's edits live).
      if (body.swappedToId) {
        router.replace(`/ricochet/play/${encodeURIComponent(body.swappedToId)}`);
        return true;
      }
      setStatus(next);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onPrimaryClick() {
    setError(null);
    if (status === "published") {
      // Unpublish: no gate, no confirm — same low-friction flip.
      void patchStatus("draft");
      return;
    }
    if (needsPlaytest) {
      // Stale gate. Edit page asks the user to confirm a force-verify
      // run; play page can only ask them to play through naturally.
      setStage(canForceVerify ? "verify-prompt" : "explainer");
      return;
    }
    setStage("confirm-publish");
  }

  function onStartVerify() {
    setStage("closed");
    startVerify();
  }

  async function onConfirmPublish() {
    const ok = await patchStatus("published");
    if (ok) setStage("closed");
  }

  const isDraft = status === "draft";
  const buttonClasses = isDraft
    ? needsPlaytest
      ? "bg-paper text-ink/60"
      : "bg-brand-yellow"
    : "bg-white";
  const buttonLabel = busy ? "…" : isDraft ? "Publish" : "Unpublish";
  const buttonTitle = isDraft && needsPlaytest
    ? canForceVerify
      ? "Click to start a full playthrough — publishing unlocks once you reach the exit."
      : "Play through this level to the exit before publishing."
    : undefined;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded-md border-2 border-ink text-[10px] font-display font-bold uppercase tracking-wide ${
            isDraft ? "bg-paper" : "bg-brand-green text-ink"
          }`}
        >
          {isDraft ? "Draft" : "Published"}
        </span>
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={busy}
          title={buttonTitle}
          className={`px-3 h-8 rounded-full border-2 border-ink font-display font-semibold text-xs flex items-center gap-1 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50 ${buttonClasses}`}
        >
          {buttonLabel}
        </button>
        {/* Out-of-modal errors (e.g. failed unpublish, where there's no
            modal to host the message). */}
        {error && stage === "closed" && (
          <span className="text-xs text-brand-coral font-semibold w-full">
            {error}
          </span>
        )}
      </div>

      {stage !== "closed" && (
        <PublishModal
          stage={stage}
          busy={busy}
          error={error}
          onClose={() => {
            setStage("closed");
            setError(null);
          }}
          onStartVerify={onStartVerify}
          onConfirmPublish={() => void onConfirmPublish()}
        />
      )}
    </>
  );
}

function PublishModal({
  stage,
  busy,
  error,
  onClose,
  onStartVerify,
  onConfirmPublish,
}: {
  stage: Exclude<Stage, "closed">;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onStartVerify: () => void;
  onConfirmPublish: () => void;
}) {
  let title: string;
  let body: React.ReactNode;
  let actions: React.ReactNode;
  switch (stage) {
    case "verify-prompt":
      title = "Test play required";
      body = (
        <p>
          Before publishing, play through this level from the spawn to
          the exit so we know it&apos;s solvable. Click Start to begin —
          the playthrough opens right here in the editor.
        </p>
      );
      actions = (
        <>
          <ModalButton onClick={onClose} variant="ghost">
            Cancel
          </ModalButton>
          <ModalButton onClick={onStartVerify} variant="primary">
            Start test
          </ModalButton>
        </>
      );
      break;
    case "verify-passed":
      title = "Test passed ✓";
      body = (
        <p>
          You cleared the level. Publish it now and it will appear on
          Explore for everyone to play.
        </p>
      );
      actions = (
        <>
          <ModalButton onClick={onClose} variant="ghost" disabled={busy}>
            Cancel
          </ModalButton>
          <ModalButton
            onClick={onConfirmPublish}
            variant="primary"
            disabled={busy}
          >
            {busy ? "Publishing…" : "Publish"}
          </ModalButton>
        </>
      );
      break;
    case "confirm-publish":
      title = "Publish this level?";
      body = (
        <p>
          The level will appear on Explore and your profile. You can
          unpublish at any time from this same control.
        </p>
      );
      actions = (
        <>
          <ModalButton onClick={onClose} variant="ghost" disabled={busy}>
            Cancel
          </ModalButton>
          <ModalButton
            onClick={onConfirmPublish}
            variant="primary"
            disabled={busy}
          >
            {busy ? "Publishing…" : "Publish"}
          </ModalButton>
        </>
      );
      break;
    case "explainer":
      title = "Test play required";
      body = (
        <p>
          Play through this level to the exit to verify it. Once you
          clear it, the Publish button will be ready.
        </p>
      );
      actions = (
        <ModalButton onClick={onClose} variant="primary">
          Got it
        </ModalButton>
      );
      break;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-xl mb-3">{title}</h2>
        <div className="text-sm text-ink/80 mb-5 space-y-2">{body}</div>
        {error && (
          <div className="mb-4 rounded-xl border-2 border-brand-coral bg-brand-coral/10 px-3 py-2 text-sm text-brand-coral font-semibold">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 flex-wrap">{actions}</div>
      </div>
    </div>
  );
}

function ModalButton({
  children,
  onClick,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "primary" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "px-4 h-9 rounded-full border-2 border-ink font-display font-semibold text-sm shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0";
  const variantClass =
    variant === "primary" ? "bg-brand-yellow" : "bg-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variantClass}`}
    >
      {children}
    </button>
  );
}
