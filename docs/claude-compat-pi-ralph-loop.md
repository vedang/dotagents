# Claude compatibility plan: pi-ralph-loop

Source: `~/src/vedang/pi-ralph-loop/pi-ralph-loop.root`

## Current shape (pi)

TS extension implementing Ralph-style autonomous loops: `/ralph` starts a
multi-iteration run against a plan (built-in targets like `unit-tests` and
`clean-room`, or a file-based plan), with per-iteration context collapse,
iteration contracts/anchors, completion detection, status-bar state, and
`/ralph-prompt` for seed prompt synthesis. Plans/progress live in
`.agents/plans/...__inprogress/`.

## Port assessment

Claude Code covers the loop mechanics natively:

- `/loop` (self-paced or interval) re-runs a prompt/skill until done.
- Autonomous background agents and cron routines for unattended runs.
- Context collapse between iterations ≈ running each iteration in a fresh
  subagent, or letting `/loop` + compaction handle long runs.

What is worth keeping is the *contract*: plan.md/progress.md discipline,
explicit stop conditions, and the seed-prompt synthesis.

## Changes

1. Ship `skills/ralph/SKILL.md`:
   - Input: a target (plan file, or built-in target name like `unit-tests`).
   - Body encodes the iteration contract: read plan.md and progress.md →
     pick the next unchecked item → implement in a fresh subagent → run the
     quality gates → update progress.md → decide done/continue using the
     existing completion rules (all items checked, or stop-reason).
   - Tell the agent to drive iterations via `/loop` (dynamic mode) so pacing
     and re-invocation are the harness's job, not custom scheduler code.
2. Port the built-in target generators (`unit-tests`, `clean-room`) as
   sections of the skill (they are prompt builders, plain text).
3. Port `/ralph-prompt` as a second skill (`ralph-prompt`) that synthesizes a
   seed plan into `.agents/plans/...__inprogress/{plan,spec,progress}.md`.
4. Drop: status-bar integration, `session_before_tree` collapse, in-memory
   scheduler — all replaced by `/loop` + subagents.

## Effort

Medium (a day). The value is in faithfully translating the iteration
contract and stop rules into the skill text.
