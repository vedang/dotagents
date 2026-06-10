# Claude compatibility plan: pi-simplify-code

Source: `~/src/vedang/pi-simplify-code/pi-simplify-code.root`

## Current shape (pi)

TS extension that watches write/edit/apply_patch tool results, detects dirty
VCS paths (git/jj), and after the turn sends a follow-up prompt asking the
agent to simplify the changed code. Modes `yes|no|ask` configured globally
(`~/.pi/agent/simplify-code.json`) or per project; manual `/simplify-code wc`.

## Port assessment

Claude Code ships `/simplify`, which covers the manual path one-to-one
("review the changed code for reuse, simplification, efficiency… then apply
the fixes"). The auto-trigger mode is reproducible with a `Stop` hook.

## Changes

1. **Manual mode: nothing to build.** Use the built-in `/simplify`.
2. **Auto mode (optional).** Add to `settings.json` a `Stop` hook running a
   small script that:
   - checks for dirty non-markdown source files (`jj diff --summary` falling
     back to `git status --porcelain` — reuse the existing detection rules);
   - reads mode from `~/.claude/simplify-code.json` /
     `.claude/simplify-code.json` (`yes|no|ask`, project overrides global);
   - on `yes`, emits `{"decision": "block", "reason": "Run /simplify on the
     files you just changed"}` so the agent continues with a simplify pass
     (guard against loops by writing a once-per-change marker file keyed on
     the VCS change id);
   - on `ask`, emits a `systemMessage` suggesting `/simplify` and lets the
     turn end.
3. The `/simplify-code wc` word-count trigger and config subcommands fold
   into the hook script's CLI (`simplify-code.sh mode [yes|no|ask]`).
4. Drop the pi extension event plumbing; the hook script plus built-in
   `/simplify` is the entire surface.

## Effort

Small (half a day) — one hook script with loop-guard logic.
