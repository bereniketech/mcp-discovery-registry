---
description: Invoke youtube-content-expert to plan, script, design thumbnails, and produce a YouTube video package end-to-end.
---

# /youtube — YouTube Content Production

Routes to the **youtube-content-expert** agent in [agents/media-company/video/youtube-content-expert.md](agents/media-company/video/youtube-content-expert.md).

## What It Does

Delegates the full YouTube production pipeline to the youtube-content-expert agent:

1. **Topic & angle research** — competitive analysis, search intent, trend signals
2. **Title + thumbnail concepts** — CTR-optimized variants for A/B
3. **Hook + script** — first 30 seconds, retention beats, B-roll cues, CTAs
4. **Thumbnail brief** — handed to image-creation-expert if image generation is needed
5. **Description, tags, chapters, end-screen** — full metadata package
6. **Repurposing plan** — Shorts cuts, blog post, newsletter, social cross-posts (delegated to content-repurposing-expert)

## When to Use

- "Make a YouTube video about X"
- "I need a video script for…"
- "Plan a 4-part YouTube series on…"
- "Pitch me 10 video ideas for my channel"

## Inputs to Provide

- Channel niche / target audience
- Video goal (subs, clicks, watch time, sales)
- Length target (Short, 8–12 min, long-form)
- Existing brand voice or example videos (optional)

## Output

Complete production package: title variants, thumbnail brief, full script with timestamps, metadata block, and repurposing checklist — ready to film.

## Related

- `/blog` — convert into a blog post
- `/social` — generate social cuts
- `chief-content-officer` agent — coordinate multi-channel campaigns
