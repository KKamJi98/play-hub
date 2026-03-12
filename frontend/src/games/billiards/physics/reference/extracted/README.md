# Extracted Reference Scenarios

Video-extracted scenarios will be placed here.

## Process

1. Capture overhead billiards video
2. Run Python tracking pipeline (`scripts/billiards-tracking/`)
3. Output JSON → convert to TypeScript `ReferenceScenario[]`
4. Manual review for accuracy
5. Commit with `source.type = "video-extracted"` and `source.videoId`
