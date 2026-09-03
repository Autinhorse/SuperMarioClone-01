import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileLevels } from "@/lib/profile";
import { LevelGrid } from "@/components/LevelGrid";

export const metadata = {
  title: "My Levels — LevelCraft Origin",
  description:
    "Everything you've built with LevelCraft Origin — published levels and drafts in progress.",
};

// The real destination for TopNav's "My Levels" link and the homepage's My
// Levels column (2026-09-03) — replacing a stopgap that sent everyone into a
// *blank* editor regardless of what they'd already built. See the comment
// this obsoletes in components/TopNav.tsx and docs/origin-main-site-plan.md.
//
// Reuses the exact query and card grid the profile page (`/u/[username]`)
// already built for "your levels, drafts included" (`LevelGrid`,
// `getProfileLevels`) — this page is that same view, narrowed to Origin and
// framed as an account page instead of a public-profile section: no avatar,
// no join date, no mention that these also show up on your profile. A
// separate `/origin/edit/{id}` React route is deliberately **not** the plan
// here — per `lib/games.ts`'s `editableInBrowser` comment, Origin's editor
// lives inside the game itself (ADR-005 decision 3), so "Edit" on a draft
// stays a `null` `editHref` (falls through to the level/preview page) until
// the game learns to open a specific cloud level from a deep link — that's
// tracked in the game repo (`docs/level/sync.md`), not solved by this page.
export default async function MyLevelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Listing "your levels" needs to know who you are — bounce to login and
  // come straight back (same pattern as /ricochet/edit/[id]).
  if (!user) {
    redirect("/login?next=/origin/my-levels");
  }

  const levels = await getProfileLevels(user.id, "origin");
  const published = levels.filter((l) => l.status === "published");
  const drafts = levels.filter((l) => l.status === "draft");

  return (
    <div className="px-6 lg:px-10 mt-6 mb-12 space-y-6">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/"
          aria-label="Back to homepage"
          className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl">My Levels</h1>
          <p className="text-sm text-ink/70">
            Everything you&apos;ve built with LevelCraft Origin.
          </p>
        </div>
        <Link
          href="/origin/web?mode=edit"
          className="px-4 h-10 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
        >
          ✏️ Build new
        </Link>
      </header>

      <section>
        <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
          <span aria-hidden>✦</span> Published{" "}
          <span className="text-ink/50 font-normal text-lg">({published.length})</span>
        </h2>
        {published.length === 0 ? (
          <EmptyState />
        ) : (
          <LevelGrid levels={published} showDelete />
        )}
      </section>

      {drafts.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
            <span aria-hidden>📝</span> Drafts{" "}
            <span className="text-ink/50 font-normal text-lg">({drafts.length})</span>
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Only you can see these. Open the desktop app (or Origin&apos;s web
            build) to keep working on one, then publish when it&apos;s ready.
          </p>
          <LevelGrid levels={drafts} showDraftBadge showDelete />
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Link
      href="/origin/web?mode=edit"
      className="block rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center hover:bg-white hover:border-ink transition"
    >
      <div className="font-display font-bold text-xl mb-2">No levels yet 👀</div>
      <p className="text-sm text-ink/70 mb-3">
        Build your first one and share it with the world.
      </p>
      <span className="inline-block px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold leading-[40px] shadow-[4px_4px_0_0_var(--color-ink)]">
        ✏️ Build Level →
      </span>
    </Link>
  );
}
