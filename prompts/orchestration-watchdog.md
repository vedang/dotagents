---
description: Start a verified periodic headless watchdog that wakes this master session for orchestration checks
argument-hint: "[minutes]"
---

Create a long-lived, read-only orchestration watchdog. Use an interval of `${1:-10}` minutes.

## Purpose

Watchdog supplies cadence and wake signal only. This master session retains all context, judgment, and authority. On each tick, master—not watchdog—checks active agents, repositories, progress, and dependency gates before deciding what to do.

## Before launch

1. Interpret `${1:-10}` as a positive whole number of minutes. If invalid, ask for a valid interval.
2. Use `pi-intercom` (`intercom` with `action: "list"`) to discover this master session's exact current ID. Never reuse an ID from an earlier session or infer it from name/path.
3. Use `interactive_shell({ listBackground: true })` to check for an existing watchdog. Do not create a duplicate. Reuse one only if its prompt targets this exact master ID and uses the requested interval; otherwise stop/dismiss stale watchdog first.
4. Derive a clear unique background-session name, preferably `orchestration-watchdog-<master-short-id>`.
5. Convert interval to seconds for `sleep` and milliseconds for interactive-shell quiet/update settings.

## Launch watchdog

Use `interactive_shell` to spawn fresh Pi with:

- `spawn.agent: "pi"`
- `spawn.mode: "fresh"`
- `mode: "dispatch"`
- `background: true`
- `cwd`: absolute path obtained by expanding `~/.pi/agent` (outside every repository; do not pass a literal unexpanded `~`)
- chosen unique `name`
- `handsFree.autoExitOnQuiet: false`
- quiet/update/grace intervals at least as long as watchdog interval

Do not create a project-scoped subagent schedule or write `.pi-subagents/schedules/**` unless user explicitly asks for that implementation.

Give spawned Pi this contract, substituting discovered master ID and calculated interval:

> You are a long-lived READ-ONLY orchestration wake timer. Never edit or create files, never inspect repositories, never run version control, never launch subagents, and never implement work. Master pi-intercom target is `<MASTER_ID>`. Repeat until stopped:
>
> 1. Immediately send one non-blocking pi-intercom message to `<MASTER_ID>`: `WATCHDOG READY — interval <MINUTES>m.`
> 2. Run one blocking `sleep <SECONDS>` with Bash. Never busy-poll or split interval into repeated status checks.
> 3. Send this exact non-blocking pi-intercom message to `<MASTER_ID>`: `WATCHDOG TICK — check intercom pending/list, jj workspace state, worker progress, and exact prompt commit gates.`
> 4. Repeat from step 2.
>
> If an intercom send fails, wait 30 seconds and retry once, then continue normal interval loop. Never send asks. If you receive a stop instruction or parent process ends, exit cleanly.

## Verify launch

1. Confirm `interactive_shell` returns named background session in running state.
2. Confirm master receives `WATCHDOG READY` through intercom.
3. Confirm `intercom list` shows watchdog Pi rooted at `~/.pi/agent`, not a repository.
4. Confirm `interactive_shell({ listBackground: true })` shows exactly one intended watchdog.
5. Do not wait a full interval merely to verify setup; READY proves routing. If READY fails, stop/dismiss watchdog and report failure rather than claiming monitoring is active.
6. Record watchdog name, target master ID, interval, and cleanup condition in current task progress ledger when one exists.

## Master behavior on every tick

Treat each `WATCHDOG TICK` intercom message as wake signal. Master should then:

1. Inspect `intercom pending` and `intercom list`.
2. Identify active, idle, blocked, completed, missing, or context-exhausted worker sessions.
3. Run `jj status` in every active workspace relevant to current orchestration.
4. Verify sole-writer ownership, workspace cleanliness where required, and exact immediate-parent commit gates—not ancestry alone.
5. Read worker progress/checkpoint evidence and confirm tests/quality gates claimed by workers.
6. Dispatch next prompt only when its exact dependency gate passes.
7. Send correction, stop, replacement, or follow-up messages when workers drift, stall, violate ownership, or exhaust context.
8. Update current progress ledger with meaningful state changes.

Watchdog must never perform these inspections or decisions itself. It only wakes master.

Ticks are approximate, not real-time. A busy master may receive queued ticks later or in a batch. Avoid launching duplicate watchdogs to compensate.

## Retargeting and cleanup

- Master intercom IDs are session-specific. If master session changes, stop old watchdog and create a new one targeting new exact ID.
- When orchestration completes, stop/dismiss named watchdog with `interactive_shell` and verify it no longer appears in background-session or intercom lists.
- Never leave watchdog running after its task lifecycle ends.

After setup, report:

- watchdog name
- interval
- target master ID
- READY verification
- background-session state
- exact cleanup action
