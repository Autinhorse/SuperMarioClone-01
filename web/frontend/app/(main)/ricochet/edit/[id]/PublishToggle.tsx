"use client";

import { useState } from "react";

type Status = "draft" | "published";

// Editor header control for the draft↔published transition. Renders
// the status badge + a button that flips the other way. Single PATCH
// per click; on success, just updates local state — sibling components
// (the Draft/Published badge) live inside this component, so no parent
// re-render is needed. The set_published_at DB trigger handles the
// timestamp on the first draft→published flip.
export function PublishToggle({
  levelId,
  initialStatus,
}: {
  levelId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function flip() {
    const next: Status = status === "draft" ? "published" : "draft";
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/levels/${encodeURIComponent(levelId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setStatus(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isDraft = status === "draft";
  return (
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
        onClick={() => void flip()}
        disabled={busy}
        className={`px-3 h-8 rounded-full border-2 border-ink font-display font-semibold text-xs flex items-center gap-1 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50 ${
          isDraft ? "bg-brand-yellow" : "bg-white"
        }`}
      >
        {busy ? "…" : isDraft ? "Publish" : "Unpublish"}
      </button>
      {error && (
        <span className="text-xs text-brand-coral font-semibold w-full">
          {error}
        </span>
      )}
    </div>
  );
}
