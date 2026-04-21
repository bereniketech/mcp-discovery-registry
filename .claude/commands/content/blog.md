---
description: Invoke blog-writing-expert to research, outline, draft, and SEO-optimize a publish-ready blog post.
---

# /blog — Blog Post Production

Routes to the **blog-writing-expert** agent in [agents/media-company/editorial/blog-writing-expert.md](agents/media-company/editorial/blog-writing-expert.md).

## What It Does

1. **Topic + intent research** — keyword pull, SERP analysis, audience pain
2. **Outline** — H2/H3 structure tuned for the target query
3. **Draft** — long-form, voice-matched, with examples and internal links
4. **SEO pass** — title, meta description, schema (Article/HowTo/FAQ), alt text
5. **Editorial polish** — readability, fact-check flags, callouts, CTA
6. **Distribution brief** — newsletter blurb, social cuts, repurposing hooks

## When to Use

- "Write a blog post about…"
- "Draft a 2,500-word guide on…"
- "Turn this transcript / video / doc into a blog post"
- "Refresh this old post for 2026"

## Inputs to Provide

- Target keyword or query
- Audience persona + funnel stage (TOFU/MOFU/BOFU)
- Word count target
- Brand voice samples or style guide (optional)
- Reference URLs or source material (optional)

## Output

Publish-ready Markdown with frontmatter (title, meta, schema), internal-link suggestions, image briefs, and a distribution checklist.

## Related

- `/seo` — deep SEO audit on the published post
- `/social` — extract social-ready cuts
- `chief-content-officer` agent — multi-piece content campaigns
