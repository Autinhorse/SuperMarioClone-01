import { Hero } from "@/components/Hero";
import { FeaturedLevels } from "@/components/FeaturedLevels";
import { LatestLevels } from "@/components/LatestLevels";
import { InfoRow } from "@/components/InfoRow";
import { StatsStrip } from "@/components/StatsStrip";
import { getHomepageData } from "@/lib/homepage";

export default async function Home() {
  const { stats, featured, latest, topCreators } = await getHomepageData();

  return (
    <>
      <Hero />
      <StatsStrip stats={stats} />
      <FeaturedLevels levels={featured} />
      <InfoRow topCreators={topCreators} />
      <LatestLevels levels={latest} />
    </>
  );
}
