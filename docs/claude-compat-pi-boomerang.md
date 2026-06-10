# Claude compatibility plan: pi-boomerang

Source: `~/src/vedang/pi-boomerang/pi-boomerang.root`

## Current shape (pi)

Large TS extension (~1900 lines): `/boomerang <task>` executes a task
autonomously, then collapses the whole exchange into a brief summary in
context. Extras: `--rethrow N` re-runs, template chaining
(`/boomerang /a -> /b`), anchors, an optional `boomerang()` agent tool, state
in `~/.pi/agent/boomerang.json`. Relies on pi-internal events
(`session_before_tree`, `agent_end`, `before_agent_start`) to rewrite context.

## Port assessment

The *purpose* — do work without polluting the main context, keep only a
compact summary — is natively covered by Claude Code subagents: a task run in
a subagent leaves only its final report in the parent context. Direct context
collapse (rewriting the parent's own history) is pi-internal and not portable.

## Changes (new shape, not a code port)

1. **Replace the core with a skill.** Ship `skills/boomerang/SKILL.md` with
   `context: fork` in frontmatter (runs the skill in an isolated subagent and
   returns only the result), or instruct the main agent to delegate
   `$ARGUMENTS` to a `general-purpose` subagent and report the summary in the
   boomerang format (task, what changed, files touched, follow-ups).
2. **Rethrow** becomes a loop instruction inside the skill: "run the task N
   times in fresh subagents, carrying forward only the accumulated summaries".
3. **Template chaining** maps to invoking other skills/commands inside the
   forked context; document `/boomerang /a -> /b` as unsupported initially.
4. **Anchors** have no Claude equivalent (no parent-context rewriting). Drop,
   and point users at `/compact` with custom instructions for after-the-fact
   collapse.
5. **Agent tool variant**: Claude already lets the model spawn subagents;
   the `boomerang()` tool is redundant. Drop.
6. Keep the pi extension as-is for pi; add the skill alongside it in the same
   repo (`skills/` is read by both harnesses) and gate pi-specific wording.

## Effort

Medium (a day): mostly writing and testing the skill prompt; delete-heavy
otherwise.
