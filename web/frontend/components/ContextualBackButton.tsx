"use client";

import { useRouter } from "next/navigation";

// Goes back in browser history when the user arrived from another
// LevelCraft page (same-origin referrer), and falls back to a
// caller-supplied URL for direct/shared-link landings. Used on play +
// edit pages so the back arrow always returns the user to where they
// actually came from instead of a hard-coded destination.
export function ContextualBackButton({
  fallbackHref,
  ariaLabel = "Back",
}: {
  fallbackHref: string;
  ariaLabel?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined") {
      try {
        const ref = document.referrer
          ? new URL(document.referrer)
          : null;
        if (ref && ref.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        // Malformed referrer URL — fall through to the default.
      }
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
    >
      ←
    </button>
  );
}
