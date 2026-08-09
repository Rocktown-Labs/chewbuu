import { MatchesReadyEmail } from "../src/templates/lifecycle";

const MatchesReadyPreview = Object.assign(MatchesReadyEmail, {
  PreviewProps: {
    ctaUrl: "https://chewbuu.com/me/dates",
    name: "Avery",
  } satisfies Parameters<typeof MatchesReadyEmail>[0],
});

export default MatchesReadyPreview;
