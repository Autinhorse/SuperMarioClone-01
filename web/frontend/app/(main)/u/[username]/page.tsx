import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getProfileLevels, type ProfileLevel } from "@/lib/profile";
import { formatCount, formatJoinDate } from "@/lib/format";

const TINTS = ["#7BB6E8", "#F4B6B6", "#F5D77A", "#A5D6A7", "#CDB4F0"];

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  return { title: `${username} — LevelCraft` };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { username } = await params;

  const profile = await getProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  const allLevels = await getProfileLevels(profile.id);
  const published = allLevels.filter((l) => l.status === "published");
  const drafts = allLevels.filter((l) => l.status === "draft");

  const totalPlays = published.reduce((sum, l) => sum + l.playCount, 0);
  const totalLikes = published.reduce((sum, l) => sum + l.likeCount, 0);

  return (
    <div className="px-6 lg:px-10 mt-10 space-y-10">
      {/* Header card */}
      <header className="rounded-3xl border-2 border-ink bg-white p-6 lg:p-8 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="size-24 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center text-5xl shrink-0" aria-hidden>
          👤
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display font-bold text-3xl mb-1">{profile.username}</h1>
          <p className="text-sm text-ink/60 mb-4">
            Member since {formatJoinDate(profile.createdAt)}
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 text-sm font-semibold">
            <Stat label="Levels" value={formatCount(published.length)} />
            <Stat label="Plays" value={formatCount(totalPlays)} icon="▶" iconClass="text-brand-green" />
            <Stat label="Likes" value={formatCount(totalLikes)} icon="♥" iconClass="text-brand-coral" />
          </div>
        </div>
        {isOwner && (
          <Link
            href="/ricochet/create"
            className="px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
          >
            ✏️ Build Level
          </Link>
        )}
      </header>

      {/* Published levels */}
      <section>
        <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
          <span aria-hidden>✦</span>{" "}
          {isOwner ? "My Published Levels" : `${profile.username}'s Levels`}{" "}
          <span className="text-ink/50 font-normal text-lg">({published.length})</span>
        </h2>

        {published.length === 0 ? (
          <EmptyState owner={isOwner} />
        ) : (
          <LevelGrid levels={published} />
        )}
      </section>

      {/* Drafts (only when viewer is owner — RLS already enforced this server-side, this is just UX) */}
      {isOwner && drafts.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
            <span aria-hidden>📝</span> Drafts{" "}
            <span className="text-ink/50 font-normal text-lg">({drafts.length})</span>
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Only you can see these. Publish a draft and it&apos;ll move up to your published list.
          </p>
          <LevelGrid levels={drafts} showDraftBadge />
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  icon?: string;
  iconClass?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon && <span className={iconClass}>{icon}</span>}
      <span className="font-display font-bold">{value}</span>
      <span className="text-ink/60">{label}</span>
    </span>
  );
}

function LevelGrid({
  levels,
  showDraftBadge = false,
}: {
  levels: ProfileLevel[];
  showDraftBadge?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {levels.map((level, i) => (
        <Link
          key={level.id}
          href={`/ricochet/play/${level.id}`}
          className="rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition block relative"
        >
          {showDraftBadge && (
            <span className="absolute top-1 left-1 z-10 px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
              Draft
            </span>
          )}
          {level.isFeatured && !showDraftBadge && (
            <span className="absolute top-1 right-1 z-10 size-7 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center text-sm">
              ⭐
            </span>
          )}
          <div
            className="aspect-square rounded-xl border-2 border-ink relative overflow-hidden"
            style={{
              backgroundColor: TINTS[i % TINTS.length],
              backgroundImage:
                "linear-gradient(to right, rgba(26,27,46,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,27,46,0.15) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            <button
              type="button"
              aria-label={`Preview ${level.title}`}
              className="absolute bottom-2 right-2 size-9 rounded-full border-2 border-ink bg-white grid place-items-center text-sm"
            >
              ▶
            </button>
          </div>
          <div className="px-1 pt-3 pb-1">
            <h3 className="font-display font-bold text-base truncate">{level.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <span className="text-brand-coral">♥</span> {formatCount(level.likeCount)}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-brand-green">▶</span> {formatCount(level.playCount)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ owner }: { owner: boolean }) {
  if (owner) {
    return (
      <Link
        href="/ricochet/create"
        className="block rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center hover:bg-white hover:border-ink transition"
      >
        <div className="font-display font-bold text-xl mb-2">No levels yet 👀</div>
        <p className="text-sm text-ink/70 mb-3">Build your first one and share it with the world.</p>
        <span className="inline-block px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold leading-[40px] shadow-[4px_4px_0_0_var(--color-ink)]">
          ✏️ Build Level →
        </span>
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
      <p className="text-sm text-ink/70">This creator hasn&apos;t published any levels yet.</p>
    </div>
  );
}
