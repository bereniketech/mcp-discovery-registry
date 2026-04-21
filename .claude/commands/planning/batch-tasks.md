---
description: Run all tasks in a folder sequentially — for each task, invoke the agent specified in the task file, then run /verify, /wrapup, and /clear before moving to the next task.
---

# Batch Tasks Command

Execute every task file in a folder in order, with full quality gates and session cleanup between tasks.

## Usage

```
/batch-tasks [folder]
```

- `folder`: path to a folder of task files, OR a single tasks.md file (default: `.spec/tasks/`)

## Task File Format

Each task file (or each `- [ ] N.` block in a single tasks.md) must have:

```markdown
## Task N — Title

Description of what to build.

_Agent: software-developer-expert_   ← agent slug from agents/ directory
_Skills: /skill-name_                ← optional, loaded via @import

**AC:** Acceptance criteria here.
```

If no `_Agent:` line is present, default to `software-developer-expert`.

## Execution Loop

For **each task** in sorted order:

### Step 1 — Skip completed tasks

Check the task file for a `Status: COMPLETE` line or a checked checkbox `[x]`. If found, print:
```
[SKIP] Task N — Title (already complete)
```
and advance to the next task.

### Step 2 — Print task header

```
════════════════════════════════════════
TASK N / TOTAL: Title
Agent: <agent-slug>
════════════════════════════════════════
```

### Step 3 — Invoke the agent

Read the full task content and invoke the specified agent as a subagent. Pass it:

```markdown
## TASK
<full task content>

## INSTRUCTIONS
Complete this task fully before returning. Follow all acceptance criteria.
Do not ask questions — make reasonable decisions and document them.
When done, output: TASK COMPLETE — <one-line summary>
```

Wait for the agent to finish before proceeding.

### Step 4 — Run /verify

Run `/verify` and evaluate the result:

- **PASS** → continue to Step 5
- **FAIL** → attempt to fix by re-invoking the same agent with the verification errors as context (one retry only). If still failing, mark the task as BLOCKED and move on:

```markdown
## Status
BLOCKED — verify failed after retry
### Errors
<paste verify output>
```

### Step 5 — Mark task complete

Update the task file:
- Change `- [ ]` to `- [x]` if using a checkbox list
- Append `Status: COMPLETE` if using individual task files

### Step 6 — Run /wrapup

Run `/wrapup` to save session memories and push a session log.

### Step 7 — Run /clear

Run `/clear` to reset the context window before starting the next task.

---

## After All Tasks

Print a final summary:

```
════════════════════════════════════════
BATCH COMPLETE
════════════════════════════════════════
Total tasks : N
Completed   : X
Skipped     : Y (already done)
Blocked     : Z (verify failed)

Blocked tasks:
- Task 3 — Auth middleware (see task file for errors)
```

## Arguments

$ARGUMENTS:
- `<folder-path>` — path to folder of task files, or a single tasks.md file (default: `.spec/tasks/`)
- `--from N` — start from task N (skip earlier tasks regardless of status)
- `--only N` — run only task N

## Rules

**Rule:** Never run tasks in parallel — always sequential. Each task's output informs the next.

**Rule:** If a task file has no `_Agent:` field, use `software-developer-expert` as the default.

**Rule:** Never skip /verify. A passing /verify is required before marking a task complete.

**Rule:** If the folder does not exist or has no task files, stop and tell the user — do not silently succeed.
