"use client";

import { useState } from "react";

// Inline-editable level title. Display mode shows the title with a
// pencil button; clicking enters edit mode (text input + Save/Cancel).
// On save, PATCHes /api/levels/[id] with the new title, then updates
// local state — no page reload, the rest of the editor (iframe state
// included) keeps running. Server-side validation in the API route
// returns 400 on bad input, surfaced inline as an error message.
export function EditableTitle({
  levelId,
  initialTitle,
}: {
  levelId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(title);
    setError(null);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      setError("1–100 characters.");
      return;
    }
    if (trimmed === title) {
      // No-op — close without a network call.
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/levels/${encodeURIComponent(levelId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setTitle(trimmed);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={100}
          disabled={saving}
          className="font-display font-bold text-2xl px-2 py-1 rounded-md border-2 border-ink bg-paper min-w-[200px] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="px-3 h-9 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold text-sm flex items-center gap-1 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="px-3 h-9 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm hover:-translate-y-0.5 transition disabled:opacity-50"
        >
          Cancel
        </button>
        {error && (
          <span className="text-xs text-brand-coral font-semibold w-full">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <h1 className="font-display font-bold text-2xl truncate">
        Editing: {title}
      </h1>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Rename level"
        className="size-8 rounded-full border-2 border-ink bg-white grid place-items-center text-sm hover:-translate-y-0.5 transition"
      >
        ✏️
      </button>
    </div>
  );
}
