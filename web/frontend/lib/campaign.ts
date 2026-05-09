import { createClient } from "@/lib/supabase/server";
import { extractPreviewPage, type PreviewPage } from "@/lib/level-preview";

// Curated 10-level campaign — the hand-built starter run players hit
// when they click "Play Ricochet" on the homepage. Sourced from the
// published+featured rows in the live levels table, so editing one of
// them in the website editor flows through here automatically (the
// previous static-bundle approach didn't have that property).
//
// Ordering: published_at ascending. The seed inserts the 10 rows in
// numeric order with millisecond-different timestamps, so this gives
// a stable Level 1 → Level 10 sequence. If a future level needs to
// slot into the middle, we'll add a `campaign_order` column rather
// than try to re-publish-time-shuffle.

export type CampaignLevel = {
  /** 1-based position in the campaign sequence. */
  n: number;
  id: string;
  title: string;
  /** Full level JSON, fed into the play iframe via postMessage. */
  data: unknown;
  thumbnailUrl: string | null;
  previewPage: PreviewPage | null;
};

const CAMPAIGN_LIMIT = 10;

export async function getCampaignLevels(): Promise<CampaignLevel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("id, title, data, thumbnail_url")
    .eq("status", "published")
    .eq("is_featured", true)
    .is("parent_id", null)
    .order("published_at", { ascending: true })
    .limit(CAMPAIGN_LIMIT);
  return (data ?? []).map((row, i) => ({
    n: i + 1,
    id: row.id,
    title: row.title,
    data: row.data,
    thumbnailUrl: row.thumbnail_url,
    previewPage: extractPreviewPage(row.data),
  }));
}
