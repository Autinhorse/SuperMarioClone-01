import { Hero } from "@/components/Hero";
import { FeaturedLevels } from "@/components/FeaturedLevels";
import { LatestLevels } from "@/components/LatestLevels";
import { InfoRow } from "@/components/InfoRow";
import { StatsStrip } from "@/components/StatsStrip";
import { AvailableGames } from "@/components/AvailableGames";
import { getHomepageData } from "@/lib/homepage";

export default async function Home() {
  const { stats, featured, latest, topCreators } = await getHomepageData();

  return (
    <>
      <Hero />
      <StatsStrip stats={stats} />
      {/* Two games now, and Origin has no other front door — /explore only
          surfaces it once someone publishes an Origin level. This component
          was written for exactly this and sat unmounted while Ricochet was
          the only game. */}
      <AvailableGames />
      <FeaturedLevels levels={featured} />
      <InfoRow topCreators={topCreators} />
      <LatestLevels levels={latest} />
    </>
  );
}
