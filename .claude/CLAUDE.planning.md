# Plan: MCP Discovery Registry

## Goal
Build a universal, community-driven MCP server discovery registry that solves discovery, trust, and integration friction in the MCP ecosystem.

## Constraints
- React + Vite + TailwindCSS frontend, Node.js backend
- Supabase (PostgreSQL) for database and auth
- npm package manager
- Frontend on Vercel, backend on Render if needed
- Must support semantic search, community signals, and one-click config generation

## Deliverables
The plan must produce:
- `.spec/plan.md` — high-level project overview: goal, tech stack, architecture diagram, file structure
- `.spec/requirements.md` — user stories and acceptance criteria (EARS format)
- `.spec/design.md` — architecture, data models, API design, ADRs, security, performance
- `.spec/tasks.md` — ordered task list with acceptance criteria per task

## Instructions
Use /planning-specification-architecture.
Write `plan.md` first as the high-level overview, then follow the skill's 3-phase gated workflow: requirements -> user approves -> design -> user approves -> tasks -> user approves.
Do not write implementation code. Do not skip approval gates.
Save each artifact only after the user explicitly approves that phase.
