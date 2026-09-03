import { OriginHero } from "@/components/OriginHero";
import { HomeColumns } from "@/components/HomeColumns";
import { getAllPublishedLevels } from "@/lib/explore";

// levelcraft.gg is Origin's site (2026-08-04).
//
// Was: a multi-game platform homepage (stats strip, "available games", featured
// / latest / top-creator rows) built when Ricochet was the only game. Ricochet
// is being retired — its routes stay reachable by direct link so already-shared
// URLs keep working, but nothing here points at it and it is off every listing.
//
// Now: banner + the same three doors the game itself opens with — Arcade,
// My Levels, World Levels. Fewer rows, each showing real content, and the shape
// matches the app so the two read as one product.
export default async function Home() {
  // ⚠️ Filter in the query, not after it. The old homepage fetched the newest 5
  // levels across all games and this page filtered to Origin afterwards — so a
  // run of recent Ricochet levels could push every Origin level out of the
  // window and render "nothing published yet" while Origin levels existed.
  // Filter-then-limit is the only order that can't lie.
  const worldLevels = await getAllPublishedLevels(3, "origin");

  return (
    <>
      <OriginHero />
      <HomeColumns worldLevels={worldLevels} />
    </>
  );
}
