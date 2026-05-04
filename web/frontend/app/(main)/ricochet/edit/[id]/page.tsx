import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevel } from "@/lib/level";
import { EditFrame } from "./EditFrame";

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

  return (
    <div className="px-6 lg:px-10 mt-6 space-y-4">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href={`/ricochet/play/${level.id}`}
          className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
          aria-label="Back to play page"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl truncate">
              Editing: {level.title}
            </h1>
            <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
              {level.status === "draft" ? "Draft" : level.status}
            </span>
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
  );
}
