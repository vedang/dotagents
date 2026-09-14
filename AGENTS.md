# Global Agent Instructions

## Repository Workflow

- Never create or switch branches unless the user explicitly asks.
- Use `jj` for version control. Always try a `jj` command first. Fallback to `git` only and only if the `jj` command does not work.
- Keep each logical task in its own commit.
- Before starting a new task, ensure you are working in a fresh `jj` change. After finishing a task, describe it with a conventional-commits message and create a new change before the next task.

## Main Agent Responsibilities

- Own the workflow: understand the request, plan the work, delegate aggressively, verify results, and decide when the task is complete.
- For behavior changes and bug fixes, create the failing test first before delegating implementation. Not everything needs a failing test. Think about the task and choose when to create the failing test.
- Run the quality gates periodically, after a batch of commits:
  - Preferred gates are `make format`, `make check`, and `make test`, in that order
  - If a repo has no Makefile or a target is missing, do not count that as a code failure by itself. Instead:
    - Record the missing target in `progress.md`.
    - Run the closest repo-native equivalents discovered from project files, such as `npm/pnpm/bun test`, `npm run build`, `uv run pytest`, `uv run ruff check`, `python -m compileall`, or documented package scripts.
    - Treat real failures in available gates as blockers; treat absent standardized targets as `unavailable` with fallback verification listed.
- Only run the `reviewer` subagent after a batch of changes have been made, and clearly ask the `reviewer` to review the full set of changes. Don't waste review cycles on small changes
- Make the final commit.

## Subagent Responsibilities

- Do as much scoped execution work as possible: recon, research, planning, implementation, and review.
- Stay within the delegated scope and follow existing code patterns.
- Create small, logical commits using `jj` when you write code.
- Do not create or update tests. If progress requires a new or changed test, stop and hand the task back to the main agent.
- Reviewer subagents may directly fix issues that do not require new or changed tests.
- Do not set turnBudget/toolBudget on subagent calls unless I ask; rely on timeoutMs.

## Planning and Progress Tracking

- Always create a task folder `TASK_DIR`:
  `.agents/plans/YYYYMMDDThhmmss--<four-word-folder-name>__<taskstate>/`
- Keep all intermediate artifacts inside that folder, including `plan.md`, `progress.md`, research notes, review notes, and subagent artifacts.
- Never create intermediate planning files at the repository root unless the user explicitly asks.
- Update `progress.md` as the task advances.

## Tagref Workflow

Use `[tag:name]` and `[ref:name]` for non-obvious constraints that must stay in sync across the codebase, such as security rules, accessibility requirements, intentional workarounds, or other cross-cutting invariants. Use lowercase names with underscores.

## Important Principles
- Do not preserve backwards compatibility unless explicitly asked. Remove obsolete paths. Do not add compatibility layers, fallbacks, migrations unless explicitly asked.
- Choose the simplest implementation that meets the current requirements. No speculative abstraction.
- Grow the system in layers, always. Start from the smallest version that works end to end, add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep the components modular and concerns clearly separated
## Instructions specifically for pi-coding-agent

### Use pi-intercom to coordinate with other local pi sessions on related codebases
Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.

### Use fast, local edits for pi-watcher turns

When a turn is explicitly marked as coming from `pi-watcher`, treat it as small editor-driven feedback. Prefer fast local edits: inspect nearby code, make pointed change, remove handled `AI!` comment, and answer briefly. Do not use full planning/delegation/quality-gate workflow unless request expands scope, touches broad behavior, or needs tests.

<!-- br-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`/`bd`) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View ready issues (open, unblocked, not deferred)
br ready              # or: bd ready

# List and search
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br search "keyword"   # Full-text search

# Create and update
br create --title="..." --description="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason="Completed"
br close <id1> <id2>  # Close multiple issues at once

# Sync with git
br sync --flush-only  # Export DB to JSONL
br sync --status      # Check sync status
```

### Workflow Pattern

1. **Start**: Run `br ready` to find actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Always run `br sync --flush-only` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only open, unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads changes to JSONL
git commit -m "..."     # Commit everything
git push                # Push to remote
```

### Best Practices

- Check `br ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `br create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always sync before ending session

<!-- end-br-agent-instructions -->
## Memory

Your memory is OptMem:
- The tool is `~/.optmem/memo`
- Your memories are in `~/.optmem/memory`

OptMem outlives every session, compaction, model and vendor change.
Without it you do not know who you are, or what was decided and tried.

### At startup: activating OptMem (mandatory)

Run `~/.optmem/memo wake` before any other tool call, in every session, and
then do exactly what it prints, to the end of its output.

### While working: register memories (mandatory)

Call `~/.optmem/memo note "<1 line, max 280 bytes>"` whenever you learn
something new, or something worth keeping happens. That covers a task
worth real effort, a fact or insight the user teaches you, anything you
learn about their life (even indirectly), any event of lasting effect.

Do not register redundant memories.

If `~/.optmem/memo note` asks a compression: do it before your next action.

Never edit or delete anything under `~/.optmem/memory`: the tool manages it.

### When you need an old memory: search, or navigate

`~/.optmem/memo recall <regex>` searches every memory, word for word.

Your memories also form a binary tree: #0-1, #2-3 ... exist as one-line
summaries, pairs of those as #0-3, and so on -- every `#a-b` line wake
prints is one node of it. `~/.optmem/memo zoom <a-b>` opens a node into its
two halves, down to the raw memories.

### If you're a subagent: skip everything related to OptMem and memo

Parallel sessions on this machine are all you, and may all write memories.
A subagent is not: it must never run `memo`, because it cannot judge what
is already known, and its notes would arrive duplicated and incorrectly.
When you spawn one, write: `You are a subagent. Don't run memo.`
