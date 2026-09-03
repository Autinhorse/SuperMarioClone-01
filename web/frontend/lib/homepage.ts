import { type PreviewPage } from "@/lib/level-preview";

/**
 * The shared "level card" row shape.
 *
 * Named for the homepage because that's where it started, and left here because
 * `lib/explore.ts` and every card component import it from this path — moving it
 * would be churn in three files for a better filename.
 *
 * The homepage's own data function is **gone** (2026-08-17). It ran four queries
 * — `homepage_stats`, featured, latest, `top_creators` — for a page that now
 * renders one list, and all four counted Ricochet. The surviving list is fetched
 * with `getAllPublishedLevels(3, "origin")`, the same function `/explore` uses;
 * two functions issuing the same query against the same table was how the
 * filter-after-limit bug got in. The stats strip / featured row / top-creators
 * components went with it.
 */
export type FeaturedLevel = {
  id: string;
  /** Which game this level belongs to. Drives the card's href — levels from
   *  different games live under different routes (see lib/games.ts). */
  gameType: string;
  title: string;
  creatorUsername: string | null;
  likeCount: number;
  playCount: number;
  /** Denormalized rating aggregates (sum + count). Average is sum/count
   *  when count > 0; cards hide the rating row entirely when count=0
   *  so a brand-new level doesn't show "0.0 / 5". */
  ratingSum: number;
  ratingCount: number;
  /** Page-0 slice of `levels.data`. Used as the SVG thumbnail fallback
   *  when thumbnailUrl is null (drafts, or rows from before the PNG
   *  pipeline shipped). null = malformed level → empty texture. */
  previewPage: PreviewPage | null;
  /** Public URL of the rendered PNG thumbnail, written by the publish
   *  API on each draft→published transition. null = no PNG yet, fall
   *  back to the inline SVG. */
  thumbnailUrl: string | null;
};
