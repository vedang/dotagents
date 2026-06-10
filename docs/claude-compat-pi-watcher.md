# Claude compatibility plan: pi-watcher

Source: `~/src/vedang/pi-watcher/pi-watcher.root`

## Current shape (pi)

TS extension: chokidar file watcher that scans for `AI!` / `AI?` / `AI.`
line-comments, batches them by intent, debounces, builds a focused prompt
with context lines, and dispatches it into the running session when idle
(busyPolicy queue). Cleans up handled markers after edits. Config in
`~/.pi/agent/pi-watcher.json` and `.pi/extensions/pi-watcher.json`;
`/watcher` command suite; status-bar widget. AGENTS.md tells the agent to
treat watcher turns as fast local edits.

## Port assessment

This is the hardest port: pi-watcher needs (a) a long-lived watcher process
and (b) a way to inject a prompt into a live session. Claude Code offers two
viable mechanisms:

- **Plugin monitors** (`monitors/monitors.json`): a plugin can declare
  background watch commands that feed events into the session — the closest
  match to the current design.
- **Headless dispatch**: a standalone daemon that runs `claude -p "<prompt>"
  --resume <session>` (or a fresh `claude -p`) per marker batch — works
  everywhere but outside the interactive session.

## Changes

1. **Restructure the repo** into a Claude plugin `pi-watcher` (rename
   `claude-watcher`?) with:
   - `monitors/monitors.json` declaring the watcher command;
   - the existing `src/watcher.ts`, `src/parser.ts`, `src/ignore.ts`,
     `src/cleanup.ts` compiled into a small standalone Node CLI — these have
     no pi dependencies and port nearly unchanged;
   - the router/dispatch layer rewritten: instead of `pi.sendMessage`, the
     monitor emits the built prompt as the monitor event payload (or, in the
     headless variant, execs `claude -p`).
2. **Prompt contract**: keep `src/prompt.ts` output, prefixed with the
   existing "fast local edit" guidance (currently in AGENTS.md's pi section)
   so the turn is handled lightly. Move that paragraph into the prompt
   itself rather than global instructions.
3. **Config**: `~/.claude/pi-watcher.json` + `.claude/pi-watcher.json`,
   same keys (roots, include, ignore, debounceMs, contextLines, marker,
   removeHandledMarkerComments, busyPolicy). Drop the `/watcher` TUI suite;
   replace with a `watcher` CLI subcommand (`status|scan|clear`).
4. **Marker cleanup** stays in the CLI (it edits files directly; no harness
   involvement needed).
5. Validate the monitor mechanism early (it is the newest/least documented
   surface); fall back to the `claude -p` daemon if monitors can't inject
   prompts the way the design needs.

## Effort

Large (2–3 days) — the watcher core is reusable, but dispatch is a redesign
and needs experimentation with plugin monitors.
