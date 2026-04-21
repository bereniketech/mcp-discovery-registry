---
description: Invoke ui-design-expert for design systems, component design, accessibility, and UI implementation specs.
---

# /ui — UI Design Expert

Routes to the **ui-design-expert** agent in [agents/software-company/design/ui-design-expert.md](agents/software-company/design/ui-design-expert.md).

## What It Does

The ui-design-expert covers the full UI/UX surface inline:

1. **Design systems** — tokens, primitives, component libraries (shadcn, Radix, Material, HIG)
2. **Component design** — buttons, forms, tables, modals, navs, dashboards, empty/loading/error states
3. **Layout + responsive** — grid systems, breakpoints, fluid type, container queries
4. **Accessibility (WCAG 2.2 AA)** — semantic HTML, ARIA, focus mgmt, color contrast, keyboard nav, screen-reader testing
5. **Motion + interactions** — micro-interactions, page transitions, scroll-driven animations, reduced-motion
6. **Dark mode + theming** — token strategy, contrast pairs, brand-tunable themes
7. **Specs for engineering** — Figma → code briefs, props/variants, edge cases, test cases

## When to Use

- "Design a [dashboard / form / pricing page / settings screen]"
- "Audit my UI for accessibility issues"
- "Create a design system for…"
- "Spec a component library based on shadcn for…"
- "Add dark mode to this app"

## Inputs to Provide

- Product / screen / component to design
- Target framework (React, Svelte, Vue, native)
- Existing design tokens / brand guidelines (optional)
- Accessibility target (default: WCAG 2.2 AA)

## Output

Component specs with tokens, variants, states, a11y notes, motion specs, and ready-to-implement code (when framework is known).

## Related

- `brand-expert` agent — visual identity and brand systems
- `web-frontend-expert` agent — implementation in React/Next.js/etc.
- `chief-design-officer` agent — multi-agent design campaigns
