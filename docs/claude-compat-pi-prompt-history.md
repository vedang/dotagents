# Claude compatibility plan: pi-prompt-history

Source: `~/src/vedang/pi-prompt-history/pi-prompt-history.root`

## Current shape (pi)

TS extension: Ctrl+R overlay to search prior user prompts across sessions.
SQLite index (`~/.pi/agent/prompt-history/history.db`) built from pi session
JSONL; local/global scopes; copy-to-editor and resume/fork actions; pi-tui
overlay UI.

## Port assessment

Claude Code already has built-in reverse history search in the prompt
(Ctrl+R) and `claude --resume` session pickers, which covers the everyday
case. The differentiators here are cross-session full-text search with
ranking and the fork action. The TUI overlay and fork/resume APIs are
pi-internal and not portable; the indexer/search core is.

## Changes

1. **Decide if it's still needed.** Try built-in Ctrl+R + `claude --resume`
   first; only invest if cross-session search is genuinely missed.
2. If kept, restructure as **indexer CLI + skill**:
   - Port `src/indexer.ts`/`src/parser.ts` to read Claude transcripts:
     `~/.claude/projects/<project-slug>/*.jsonl`, extracting `type: "user"`
     entries. Keep the SQLite schema; store the DB under
     `~/.claude/prompt-history/history.db`.
   - Ship `skills/prompt-history/SKILL.md`: `/prompt-history <query>` runs the
     CLI (`search <query> [--global]`) and shows ranked matches; the user
     copies the one they want. `disable-model-invocation: true`.
   - Incremental indexing can run from the same CLI on each invocation
     (mtime/size skip logic already exists), or via a `SessionStart` hook
     (`async: true`) so the index stays warm.
3. **Drop** the overlay UI, Ctrl+R binding (taken by the built-in), and
   resume/fork actions (use `claude --resume` instead).
4. Keep the sqlite3-CLI approach — no npm runtime deps survive the port.

## Effort

Medium (1–2 days), mostly transcript-format adaptation and CLI ergonomics.
