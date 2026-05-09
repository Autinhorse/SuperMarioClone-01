import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevel } from "@/lib/level";
import { EditFrame } from "./EditFrame";
import { EditableTitle } from "./EditableTitle";
import { ContextualBackButton } from "@/components/ContextualBackButton";
import { PublishProvider } from "@/components/PublishProvider";
import { PublishToggle } from "./PublishToggle";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const level = await getLevel(id);
  if (!level) return { title: "Edit — LevelCraft" };
  return { title: `Edit: ${level.title} — Ricochet — LevelCraft` };
}

export default async function EditLevelPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Editing requires sign-in. Bounce anonymous visitors to login with a
  // ?next= so they land back here after auth.
  if (!user) {
    redirect(`/login?next=/ricochet/edit/${encodeURIComponent(id)}`);
  }

  const level = await getLevel(id);
  // 404 covers both "doesn't exist" and "exists but you're not the
  // creator" — RLS already hides drafts from non-owners on read; for
  // published levels owned by someone else, we also refuse to surface
  // the editor (don't leak existence).
  if (!level || level.gameType !== "ricochet" || level.creatorId !== user.id) {
    notFound();
  }

  // Revision-swap fork: editing a published level happens on a draft
  // copy ("fork") so the live row stays playable until the user
  // publishes the edits, at which point we swap content back into the
  // parent. The unique (parent_id, creator_id) index makes this
  // idempotent — re-entering the editor for the same parent always
  // lands on the same fork instead of accumulating drafts.
  if (level.status === "published") {
    const { data: existingFork } = await supabase
      .from("levels")
      .select("id")
      .eq("parent_id", level.id)
      .eq("creator_id", user.id)
      .maybeSingle();
    if (existingFork) {
      redirect(`/ricochet/edit/${existingFork.id}`);
    }
    const { data: newFork, error: forkErr } = await supabase
      .from("levels")
      .insert({
        creator_id: user.id,
        game_type: level.gameType,
        title: level.title,
        description: level.description,
        data: level.data,
        status: "draft",
        parent_id: level.id,
      })
      .select("id")
      .single();
    if (forkErr || !newFork) {
      throw new Error(
        `Could not start editing: ${forkErr?.message ?? "unknown error"}`,
      );
    }
    // We can't revalidatePath here — Next.js 16 forbids it during
    // Server Component render. The fork appears on the user's profile
    // on the next hard navigation; a router.back() right after editing
    // may briefly show stale (no fork) until they manually refresh.
    // Acceptable trade-off — fork-create is a side path most users
    // won't immediately back-out of.
    redirect(`/ricochet/edit/${newFork.id}`);
  }

  // Removed levels can't be edited (the editor route should never be
  // reachable for them via UI, but defensively render a flat header).
  if (level.status === "removed") {
    return (
      <div className="px-6 lg:px-10 mt-6 space-y-4">
        <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
          <ContextualBackButton fallbackHref="/" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <EditableTitle levelId={level.id} initialTitle={level.title} />
              <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
                Removed
              </span>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <PublishProvider
      initialStatus={level.status}
      initialNeedsPlaytest={level.needsPlaytest}
    >
      <div className="px-6 lg:px-10 mt-6 space-y-4">
        <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
          <ContextualBackButton fallbackHref="/" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <EditableTitle levelId={level.id} initialTitle={level.title} />
              <PublishToggle levelId={level.id} />
            </div>
            <p className="text-sm text-ink/70">
              Changes save back to your level. Test-plays from inside the
              editor don&apos;t count toward play stats.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border-2 border-ink bg-ink p-2 shadow-[6px_6px_0_0_var(--color-ink)]">
          <div className="aspect-[5/3] w-full rounded-2xl bg-[#22252c] overflow-hidden">
            <EditFrame levelId={level.id} levelData={level.data} />
          </div>
        </section>
      </div>
    </PublishProvider>
  );
}
