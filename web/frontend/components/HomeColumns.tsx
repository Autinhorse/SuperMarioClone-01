import Link from "next/link";
import Image from "next/image";
import { arcadeLevels, arcadePlayHref, arcadeThumbHref } from "@/lib/arcade";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import type { FeaturedLevel } from "@/lib/homepage";

// The homepage's three doors: Arcade / My Levels / World Levels.
//
// Deliberately the **same three** the game shows on its own front page, with the
// same icons (`styles/default/ui/front/btn-*.png`, copied into public/origin/).
// Somebody who has played the app should recognise this page instantly, and
// somebody who starts here should not be surprised by the app.
//
// Each column: icon + a few real items + a More link into the full page. Showing
// actual content rather than three buttons is the point — it's what makes the
// homepage worth loading.

const PREVIEW_COUNT = 3;

export function HomeColumns({ worldLevels }: { worldLevels: FeaturedLevel[] }) {
  // Arcade is bundled in the build and known at compile time — no query, no
  // loading state, and it can never be empty in practice.
  const arcade = arcadeLevels().slice(0, PREVIEW_COUNT);

  return (
    <section className="px-6 lg:px-10 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Column
        icon="/origin/btn-arcade.png"
        title="Arcade"
        blurb="Levels built into the game. A good place to start."
        moreHref="/origin/arcade"
      >
        {arcade.map((lv) => (
          <Row
            key={lv.slug}
            href={arcadePlayHref(lv.slug)}
            title={lv.title}
            thumb={
              <Image
                src={arcadeThumbHref(lv)}
                alt={lv.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            }
          />
        ))}
      </Column>

      <Column
        icon="/origin/btn-mylevels.png"
        title="My Levels"
        blurb="Everything you've built. Edit, publish, or start something new."
        moreHref="/origin/web?mode=edit"
        moreLabel="Open editor"
      >
        {/* Your own levels live in the game (browser storage or your account),
            not in a table this page can read without knowing who you are.
            Rather than render an empty shell for signed-out visitors, this
            column stays an invitation and hands off to the app. */}
        <p className="text-sm text-ink/70 px-1 py-2">
          Build a level in the browser — it opens straight into the editor, and
          you can publish it when you&apos;re happy with it.
        </p>
      </Column>

      <Column
        icon="/origin/btn-levelworld.png"
        title="World Levels"
        blurb="Levels published by other players."
        moreHref="/explore"
      >
        {worldLevels.length === 0 ? (
          <p className="text-sm text-ink/70 px-1 py-2">
            Nothing published yet — yours could be the first.
          </p>
        ) : (
          worldLevels.slice(0, PREVIEW_COUNT).map((lv) => (
            <Row
              key={lv.id}
              href={`/origin/play/${lv.id}`}
              title={lv.title}
              subtitle={lv.creatorUsername ? `by ${lv.creatorUsername}` : undefined}
              // ⚠️ Only mount LevelThumbnail when there IS a stored PNG.
              // Its fallback is Ricochet's SVG renderer, which can't read an
              // Origin payload and fills the frame with a blank green grid —
              // reads as "a level made entirely of grass", i.e. a broken
              // image. Same guard as /origin/play/[id].
              thumb={
                lv.thumbnailUrl ? (
                  <LevelThumbnail
                    thumbnailUrl={lv.thumbnailUrl}
                    previewPage={null}
                    alt={lv.title}
                  />
                ) : (
                  <span
                    className="absolute inset-0 grid place-items-center text-xl"
                    aria-hidden
                  >
                    🗺️
                  </span>
                )
              }
            />
          ))
        )}
      </Column>
    </section>
  );
}

function Column({
  icon,
  title,
  blurb,
  moreHref,
  moreLabel = "More",
  children,
}: {
  icon: string;
  title: string;
  blurb: string;
  moreHref: string;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col">
      <div className="flex items-center gap-3">
        <Image
          src={icon}
          alt=""
          width={64}
          height={64}
          className="size-16 shrink-0"
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="font-display font-bold text-xl">{title}</h2>
          <p className="text-sm text-ink/70 leading-snug">{blurb}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 flex-1">{children}</div>

      <Link
        href={moreHref}
        className="mt-4 self-start px-4 h-9 rounded-full border-2 border-ink bg-paper font-display font-semibold text-sm flex items-center gap-1 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
      >
        {moreLabel} →
      </Link>
    </div>
  );
}

function Row({
  href,
  title,
  subtitle,
  thumb,
}: {
  href: string;
  title: string;
  subtitle?: string;
  thumb: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper/60 p-2 transition group"
    >
      <div className="relative h-14 w-24 shrink-0 rounded-lg border-2 border-ink overflow-hidden bg-paper">
        {thumb}
      </div>
      {/* min-w-0 + truncate: without it a long title pushes the row wider than
          the card and spills into the next column. */}
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold text-sm truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-ink/60 truncate">{subtitle}</div>
        )}
      </div>
      <span className="shrink-0 text-sm opacity-0 group-hover:opacity-100 transition" aria-hidden>
        ▶
      </span>
    </Link>
  );
}
