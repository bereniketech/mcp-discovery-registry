---
description: Invoke chief-marketing-officer to plan and orchestrate a full multi-channel marketing campaign.
---

# /campaign — Marketing Campaign Orchestrator

Routes to the **chief-marketing-officer** agent in [agents/marketing-company/chief-marketing-officer.md](agents/marketing-company/chief-marketing-officer.md).

## What It Does

The CMO agent coordinates all marketing specialists into one campaign plan:

| Workstream | Specialist routed to |
|---|---|
| SEO + content | seo-expert, blog-writing-expert |
| Paid media | paid-ads-expert |
| Email + lifecycle | email-marketing-expert, newsletter-expert |
| Organic social | social-media-expert |
| Competitor research | competitor-intelligence-expert |
| Growth experiments | growth-marketing-expert |
| Video / YouTube | youtube-content-expert |
| Brand + visuals | brand-expert, image-creation-expert |

## Output

A complete campaign brief:

1. **Goal + KPIs** — North-star metric, leading indicators, target lift
2. **Audience + positioning** — ICP, JTBD, message map
3. **Channel mix + budget split** — paid/organic/owned ratios
4. **Asset list** — every piece needed (blog, video, ad creative, email, social cuts)
5. **Production schedule** — who produces what, in what order
6. **Launch sequence** — pre-launch, launch day, sustain phase
7. **Measurement plan** — tracking, attribution, weekly review cadence

## When to Use

- "Plan a launch campaign for our new product"
- "Run a 6-week awareness push"
- "Coordinate marketing for our fundraise announcement"
- "Build a Q2 growth plan"

## Inputs to Provide

- Product / offer
- Audience + positioning
- Goal + budget
- Timeline
- Existing assets / brand guidelines (optional)

## Related

- `/seo`, `/blog`, `/social`, `/youtube` — invoke individual specialists
- `/company` — full-company orchestration (engineering + product + marketing)
