import { OriginHero } from "@/components/OriginHero";
import { HomeColumns } from "@/components/HomeColumns";
import { getHomepageData } from "@/lib/homepage";

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
  // Only the "latest published" list survives from the old homepage query; it
  // feeds the World Levels column. The stats / featured / top-creators RPCs are
  // no longer called here — they count Ricochet too, and there is nowhere left
  // on this page to show them.
  const { latest } = await getHomepageData();
  const worldLevels = latest.filter((l) => l.gameType === "origin");

  return (
    <>
      <OriginHero />
      <HomeColumns worldLevels={worldLevels} />
    </>
  );
}
