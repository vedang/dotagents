---
description: Stop one orchestration watchdog safely and verify its shutdown
argument-hint: "[watchdog-session-id]"
---

Stop one long-lived orchestration watchdog. Optional explicit target: `${1:-}`.

## Safety boundary

Stop only one exact background session. Never call `interactive_shell` with `dismissBackground: true`, never kill by process-name pattern, and never stop unrelated background sessions or Pi processes.

## Resolve target

1. Call `interactive_shell({ listBackground: true })`.
2. If `${1:-}` is non-empty:
   - treat it as the exact interactive-shell background session ID;
   - require it to start with `orchestration-watchdog-`;
   - require the background-session listing to show that exact ID running a Pi command whose prompt identifies it as the read-only orchestration wake timer;
   - if validation fails, stop and report the mismatch without dismissing anything.
3. If `${1:-}` is empty:
   - call `intercom` with `action: "list"` and identify this master session's exact current ID and displayed short ID;
   - derive the exact target `orchestration-watchdog-<master-short-id>`;
   - require the background-session listing to show that exact ID running the read-only orchestration wake timer;
   - if no exact target exists, report that this master's watchdog is already stopped and make no changes;
   - if similar or multiple watchdogs exist but no exact target matches, list their IDs and require an explicit argument. Do not guess.

## Stop and verify

1. Stop the exact validated target with `interactive_shell({ dismissBackground: "<exact-target-id>" })`.
2. Call `interactive_shell({ listBackground: true })` again and verify the exact target is absent.
3. Call `intercom` with `action: "list"` and verify the watchdog Pi targeting the master is absent. Allow one bounded recheck after a short delay for disconnect propagation; do not poll indefinitely.
4. If the background session is gone but intercom still lists the watchdog after the bounded recheck, report partial cleanup instead of claiming success.

## Report

Report:

- exact watchdog session ID
- dismissal result
- background-session verification
- intercom verification
- whether cleanup fully succeeded, was already complete, or needs manual follow-up
