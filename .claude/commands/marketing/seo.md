---
description: Invoke seo-expert for technical audits, content optimization, keyword strategy, schema, and programmatic SEO.
---

# /seo — SEO Expert

Routes to the **seo-expert** agent in [agents/marketing-company/strategy/seo-expert.md](agents/marketing-company/strategy/seo-expert.md).

## What It Does

The seo-expert covers all 31 SEO sub-skills inline:

1. **Technical SEO** — crawl, indexability, Core Web Vitals, hreflang, canonicals, sitemaps, robots
2. **On-page SEO** — title/meta, heading structure, internal linking, content optimization
3. **Schema markup** — Article, Product, FAQ, HowTo, LocalBusiness, Breadcrumbs, Organization
4. **Keyword strategy** — search intent mapping, topic clusters, content gap analysis
5. **Content SEO** — E-E-A-T, freshness, semantic depth, refresh playbooks
6. **Programmatic SEO** — template SEO at scale, dataset → page generation
7. **Local + Legal SEO** — GBP, citations, regulated-industry compliance
8. **Audit** — full site audit with priority backlog (CRITICAL/HIGH/MEDIUM/LOW)

## When to Use

- "Audit my site for SEO issues"
- "Why is this page not ranking?"
- "Build a topic cluster around X"
- "Generate schema markup for…"
- "Plan a programmatic SEO build for…"
- "Refresh this old post for ranking"

## Inputs to Provide

- Site URL or page URL(s)
- Target keyword(s) or topic
- Current ranking / GSC data (optional)
- Competitors to benchmark (optional)

## Output

Prioritized findings list with file/URL locations, before/after diffs, schema JSON-LD, and a phased remediation plan.

## Related

- `/blog` — write SEO-optimized content
- `/campaign` — full marketing campaign with SEO included
- `competitor-intelligence-expert` agent — SERP competitor analysis
