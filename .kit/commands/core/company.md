---
description: Invoke company-coo — the master router that delegates any task to the right operating company CEO (software-cto, chief-marketing-officer, chief-content-officer) or board peer (chief-of-staff, chief-design-officer, people-operations-expert).
---

# /company — Company COO (Master Router)

Routes to the **company-coo** agent in [agents/board/company-coo.md](agents/board/company-coo.md).

## What It Does

The COO is the top-level coordinator for the entire holding company. It detects intent and dispatches to the correct operating company CEO — you give it any goal and it figures out which company should run it. Each CEO then routes work internally to their specialists; the COO does not reach past CEOs.

## Holding Company Routing Map

| Domain | Operating company CEO | Examples |
|---|---|---|
| Software, web, mobile, desktop, infra, AI/ML, agents, RAG, prompts, product, business, sales, CS, ops, fintech, ERP, security, pentest, compliance, legal, software UI | [software-cto](agents/software-company/software-cto.md) | "Build an app", "Build a RAG system", "Write a PRD", "Pentest our API", "Get SOC 2 ready" |
| Marketing, SEO, paid, growth, email, brand, positioning | [chief-marketing-officer](agents/marketing-company/chief-marketing-officer.md) | "Plan a launch campaign", "Audit our funnel", "Build a brand identity" |
| Content, video, blog, podcast, newsletter, social, image creation, presentations, technical writing | [chief-content-officer](agents/media-company/chief-content-officer.md) | "Make a YouTube series", "Launch a newsletter", "Produce a pitch deck" |

| Cross-company (board peers) | Agent | Examples |
|---|---|---|
| Cross-company ops, escalations between CEOs, weekly reviews | [chief-of-staff](agents/board/chief-of-staff.md) | "Coordinate launch comms", "Run a weekly review" |
| Cross-company design coherence (UI ↔ brand ↔ visuals) | [chief-design-officer](agents/board/chief-design-officer.md) | "Keep design consistent across all 3 companies" |
| Corporate HR, hiring, comp, contracts, handbook | [people-operations-expert](agents/board/people-operations-expert.md) | "Hire a senior engineer", "Write our handbook" |

## Process

1. **Intent detection** — parses the request, identifies primary domain(s)
2. **Plan composition** — single-department or multi-department workflow
3. **Delegation** — invokes department leads in the right order with the right context
4. **Coordination** — handoffs, dependencies, parallel vs sequential
5. **Synthesis** — merges deliverables into one unified output

## When to Use

- "I want to launch a new product" → triggers product + engineering + marketing + design + content
- "Take this idea from zero to live" → full-company orchestration
- "I'm not sure which agent I need" → COO will figure it out
- Any cross-functional initiative

## Inputs to Provide

- The goal (as specific or vague as you want)
- Constraints (timeline, budget, team size) — optional
- Existing context (repo, brand, audience) — optional

## Output

A unified plan with phase breakdown, agent assignments, dependencies, and a single synthesized deliverable when the workflow completes.

## Related

- All `/department-name` commands invoke a single department directly
- `/plan` — pure planning without execution
- `/orchestrate` — multi-agent execution at the engineering level
