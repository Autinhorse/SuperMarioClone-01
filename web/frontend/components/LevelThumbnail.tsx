import { LevelThumb } from "@/components/LevelThumb";
import type { PreviewPage } from "@/lib/level-preview";

// Picks the right thumbnail surface for a level card. Published levels
// have a server-rendered PNG (sprite-based, fidelity matches the game)
// stored at thumbnailUrl; drafts and pre-pipeline rows fall back to the
// inline SVG renderer that walks the level data directly. Both render
// the same 30:18 aspect — callers control the outer container shape and
// rely on object-contain to letterbox into whatever the card uses.
export function LevelThumbnail({
  thumbnailUrl,
  previewPage,
  alt,
}: {
  thumbnailUrl: string | null;
  previewPage: PreviewPage | null;
  alt: string;
}) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-contain block"
        style={{ backgroundColor: "#f7f4ec" }}
      />
    );
  }
  return <LevelThumb page={previewPage} />;
}
