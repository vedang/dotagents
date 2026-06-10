# Installing this harness configuration for Claude Code

This repo carries my harness configuration for multiple coding agents. The
`claude/` directory holds the Claude Code surface. Everything that can be
shared with other harnesses (pi, codex) is a relative symlink back to the
shared files at the repo root; only genuinely Claude-specific files are real
files.

## Layout

```
claude/
├── CLAUDE.md          -> ../AGENTS.md (shared global instructions)
├── settings.json      Claude Code settings: output style, hooks, statusline, permissions
├── statusline.sh      Status line script (model | dir | jj/git | context %)
├── hooks/
│   └── notify.sh      Terminal notification on Stop/Notification events
├── agents/            Subagent role cards (claude frontmatter: tools, model)
│   ├── scout.md  planner.md  plan-reviewer.md  worker.md
│   ├── reviewer.md  researcher.md  context-builder.md  multimodal.md
└── skills/
    ├── handoff/       /handoff — draft a context-transfer prompt for a new session
    └── docx, pdf, pptx, xlsx, skill-creator,
        impeccable, mck-consult, tufte-viz   -> ../../skills/* (shared)
```

## Setup

Clone the repo (if not already present) and symlink the Claude surfaces into
`~/.claude`. Do **not** symlink `~/.claude` itself — Claude Code keeps mutable
state there (sessions, todos, auto-memory).

```sh
git clone https://github.com/vedang/agents ~/.config/agents
mkdir -p ~/.claude

# Back up anything you already have at these paths first.
ln -s ~/.config/agents/claude/CLAUDE.md      ~/.claude/CLAUDE.md
ln -s ~/.config/agents/claude/settings.json  ~/.claude/settings.json
ln -s ~/.config/agents/claude/agents         ~/.claude/agents
ln -s ~/.config/agents/claude/skills         ~/.claude/skills
ln -s ~/.config/agents/claude/hooks          ~/.claude/hooks
ln -s ~/.config/agents/claude/statusline.sh  ~/.claude/statusline.sh
ln -s ~/.config/agents/prompts               ~/.claude/commands
```

Notes on each link:

- `CLAUDE.md` — global user memory; resolves to the shared `AGENTS.md`
  (jj workflow, planning folders, quality gates, delegation rules, tagref).
  The pi-specific section at the bottom is inert for Claude.
- `settings.json` — sets the built-in **Explanatory** output style (replaces
  `pi-extensions/explanatory-output-style.ts`), always-on thinking, the
  statusline command, the notification hooks, and a permission allowlist for
  read-only `jj`/`git` and `make` gates. Hook and statusline paths point at
  `~/.claude/...`, which the links above resolve into this repo.
- `agents` — role cards ported from `agents/*.md`. Frontmatter is
  Claude-specific (`tools:` use Claude tool names; `model:` uses
  haiku/sonnet/opus/inherit tiers). The `*.chain.md` chain files are
  deliberately not ported (unused).
- `skills` — `handoff` plus symlinks to the shared document skills. Skills
  double as slash commands in Claude Code (`/handoff`, `/pdf`, ...).
- `commands` — the shared `prompts/` templates work as Claude custom
  commands as-is (`/sharpen-communication`). Both harnesses understand
  `$ARGUMENTS`.

`APPEND_SYSTEM.md` (pi appends it to the system prompt) has no direct Claude
equivalent and its delegation playbook is already covered by the Subagent
sections of `AGENTS.md`; nothing to link.

## Verify

1. `claude` in any repo, then:
   - `/status` — confirm settings loaded, output style `Explanatory`.
   - `/agents` — the eight role cards should list under "Personal agents".
   - `/handoff test` and `/sharpen-communication test` — slash commands resolve.
   - The status line should show `model | dir | jj:<change> | ctx:N%`.
2. Trigger a permission prompt or let a turn finish — your terminal
   (Ghostty/iTerm2/WezTerm/Kitty) should show a native notification from
   `hooks/notify.sh`.
3. `claude doctor` for a general health check.

## What replaces the pi packages

Claude Code has built-in equivalents for much of the pi package list; the rest
ports as skills or needs rework (see the `docs/claude-compat-*.md` plans for
my own extensions).

| pi package | In Claude Code |
|---|---|
| `ghoseb/pi-askuserquestion` | Built-in `AskUserQuestion` tool. |
| `pi-subagents` (npm) | Built-in subagents (`~/.claude/agents/*.md`, Task tool, background tasks, worktree isolation) and the Workflow tool. |
| `championswimmer/pi-context-{prune,usage}`, `pi-cache-graph` | Built-in `/context`, microcompaction, and context display in the status line data. |
| `Whamp/pi-read-map` | Built-in `Read` handles large files (offset/limit); no port needed. |
| `ghoseb/pi-damage-control` | `permissions.deny` rules in `settings.json` + `PreToolUse` hooks for anything fancier. |
| `dbachelder/pi-btw` | No direct equivalent; use multiple sessions/tabs or background subagents. |
| `mattleong/pi-better-openai` | N/A (OpenAI-specific). `/fast` exists natively for Opus. |
| `pi-intercom` (npm) | No direct equivalent; agent teams/channels cover parts of it. |
| `pi-interactive-shell` (npm) | Mostly unneeded (Claude Code has background shells); cheat-sheet skills can be linked if missed. |
| `nicobailon/visual-explainer`, `unravel-proposal-creator` | Installed as plugins from their GitHub marketplaces. |
| `pasky/chrome-cdp-skill`, `davebcn87/pi-autoresearch` | Installed as plugins from local forks (`~/src/pasky/...`, `~/src/davebcn87/...`) after adding `.claude-plugin` manifests there. |
| `unravel-team/dafny-estimation` | Ships `plugin.json` but no marketplace; installed via the personal [`claude/extras-marketplace/`](../claude/extras-marketplace/.claude-plugin/marketplace.json) (`dafny-estimation@vedang-extras`). |
| `vedang/*` (caveman, humanizer, rote-skills, pi-adr, pi-boomerang, pi-prompt-history, pi-quizme, pi-ralph-loop, pi-review-code, pi-simplify-code, pi-watcher) | See `docs/claude-compat-*.md` migration plans. |

## pi → Claude Code surface map (reference)

| pi (`~/.pi/agent/`) | Claude Code (`~/.claude/`) |
|---|---|
| `AGENTS.md` context file | `CLAUDE.md` |
| `APPEND_SYSTEM.md` | No equivalent (use output styles or CLAUDE.md) |
| `settings.json` | `settings.json` (different schema) |
| `extensions/*.ts` (event API) | Hooks (`settings.json`), statusline script, skills, MCP servers, plugins |
| `skills/` | `skills/` (same SKILL.md standard) |
| `prompts/*.md` templates | `commands/*.md` (or skills) |
| `agents/*.md` (pi-subagents) | `agents/*.md` (built-in, different frontmatter) |
| `packages` in settings | Plugins + marketplaces |
| `themes/`, `keybindings.json` | `/config` theme; `keybindings.json` (different format) |
| `models.json` custom providers | N/A (Anthropic models; `ANTHROPIC_BASE_URL`/gateways for routing) |
