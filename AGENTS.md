## Repository Workflow

- Never create or switch branches unless the user explicitly asks.
- Use `jj` for version control. Always try a `jj` command first. Fallback to `git` only and only if the `jj` command does not work.
- Keep each logical task in its own commit.
- Before starting a new task, ensure you are working in a fresh `jj` change. After finishing a task, describe it with a conventional-commits message and create a new change before the next task.

## Main Agent Responsibilities

- Run the quality gates periodically, after a batch of commits:
  - Preferred gates are `make format`, `make check`, and `make test`, in that order
  - If a repo has no Makefile or a target is missing, do not count that as a code failure by itself.

## Important Principles

- Do not preserve backwards compatibility unless explicitly asked. Remove obsolete paths. Do not add compatibility layers, fallbacks, migrations unless explicitly asked.
- Choose the simplest implementation that meets the current requirements. No speculative abstraction.
- Grow the system in layers, always. Start from the smallest version that works end to end, add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep the components modular and concerns clearly separated

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`/`bd`) for issue tracking. Issues are stored in `.beads/` and tracked in git.

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
