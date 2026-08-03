"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteLevelAction } from "@/lib/levels/actions";

// Trash-icon button overlaid on a level card on the profile page.
// Confirmation modal guards the destructive action; on success the
// page is router.refresh()ed so the deleted card disappears from the
// grid without a full reload. The button calls preventDefault on its
// click so the surrounding card-wrapping <Link> doesn't navigate.
export function DeleteLevelButton({
  levelId,
  levelTitle,
}: {
  levelId: string;
  levelTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal(e: React.MouseEvent) {
    // Stop the parent <Link> from navigating to the level page.
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setOpen(true);
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteLevelAction(levelId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={`Delete ${levelTitle}`}
        title="Delete"
        className="absolute top-1 right-1 z-10 size-11 rounded-full border-2 border-ink bg-white grid place-items-center text-base shadow-[1px_1px_0_0_var(--color-ink)] hover:bg-brand-coral hover:text-white transition"
      >
        🗑
      </button>

      {open && (
        <DeleteModal
          levelTitle={levelTitle}
          busy={busy}
          error={error}
          onCancel={(e) => {
            e?.preventDefault();
            e?.stopPropagation();
            if (!busy) setOpen(false);
          }}
          onConfirm={(e) => {
            e?.preventDefault();
            e?.stopPropagation();
            void confirmDelete();
          }}
        />
      )}
    </>
  );
}

function DeleteModal({
  levelTitle,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  levelTitle: string;
  busy: boolean;
  error: string | null;
  onCancel: (e?: React.MouseEvent) => void;
  onConfirm: (e?: React.MouseEvent) => void;
}) {
  // Rendered into document.body via portal. The card this dialog
  // belongs to has `hover:-translate-y-0.5 transition` — any non-none
  // transform makes that element a containing block for `position:
  // fixed` descendants, which would size the modal to the card
  // (thumbnail-shaped) instead of the viewport. The portal escapes
  // the card's DOM subtree entirely, sidestepping that and the
  // outer <Link>'s click-propagation issues at the same time.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) onCancel();
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-xl mb-3">Delete level?</h2>
        <p className="text-sm text-ink/80 mb-2">
          <span className="font-semibold">{levelTitle}</span> will be
          permanently removed, along with any likes it has received.
          This cannot be undone.
        </p>
        {error && (
          <div className="mt-4 rounded-xl border-2 border-brand-coral bg-brand-coral/10 px-3 py-2 text-sm text-brand-coral font-semibold">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 flex-wrap mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 h-9 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 h-9 rounded-full border-2 border-ink bg-brand-coral text-white font-display font-semibold text-sm shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
