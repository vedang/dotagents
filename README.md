# .config/agents

![Agents Banner](images/banner.png)

My personal configuration for [Pi](https://github.com/badlogic/pi-mono) (`pi-coding-agent`) and local coding agents. Clone it to `~/.config/agents` and symlink the pieces you want into `~/.pi/agent/`.

Public guide: [vedang.me/dotagents](https://vedang.me/dotagents/).

## Setup (`pi-coding-agent`)

```sh
git clone https://github.com/vedang/dotagents ~/.config/agents
mkdir -p ~/.pi/agent
ln -s ~/.config/agents/AGENTS.md ~/.pi/agent/AGENTS.md
ln -s ~/.config/agents/pi-settings.json ~/.pi/agent/settings.json
ln -s ~/.config/agents/pi-models.json ~/.pi/agent/models.json
ln -s ~/.config/agents/prompts ~/.pi/agent/prompts
ln -s ~/.config/agents/skills ~/.pi/agent/skills
```

## Current Pi runtime profile

Source of truth: [`pi-settings.json`](pi-settings.json) and [`pi-models.json`](pi-models.json).

### Core defaults

| Setting | Value | Notes |
|---------|-------|-------|
| `defaultProvider` | `openai` | Sign in with ChatGPT through `/login openai`. |
| `defaultModel` | `gpt-6.1-sol` | Default model for new sessions. |
| `defaultThinkingLevel` | `medium` | Moderate reasoning by default. |
| `defaultTools` | `["+codemode"]` | Enables `codemode` alongside the standard tools. |
| `steeringMode` | `all` | Apply steering globally. |
| `followUpMode` | `one-at-a-time` | Sequential follow-up flow. |
| `hideThinkingBlock` | `false` | Show thinking block. |
| `theme` | `dark` | Dark terminal theme. |
| `tuiMode` | `regular` | Standard Pi TUI mode. |
| `compaction.enabled` | `true` | Automatic context compaction (`reserveTokens: 16384`, `keepRecentTokens: 12000`). |

### Enabled models

- `deepseek/deepseek-flash`
- `local/mlx-community/Qwen3.8-27B-4bit` (served locally via MLX on `http://127.0.0.1:8080/v1`, defined in [`pi-models.json`](pi-models.json))
- `moonshotai/kimi-k3`
- `zai/glm-5.3`
- `openai/gpt-5.6-terra`
- `openai/gpt-6-astra`
- `openai/gpt-6-luna`
- `openai/gpt-6-sol`
- `openai/gpt-6.1-sol`
- `anthropic/claude-opus-5-5`
- `anthropic/claude-sonnet-5-5`
- `anthropic/claude-fable-5-1`

### Active packages (`pi-settings.json` → `"packages"`)

| Package | Source | Purpose |
|---------|--------|---------|
| `pi-review` | `git:github.com/earendil-works/pi-review` | Structured code review workflow (`/review`, `/end-review`) across diffs, branches, commits, PRs, and folders. |
| `pi-damage-control` | `git:github.com/ghoseb/pi-damage-control` | Command and path safety rules configured via [`extension_config/damage-control/config.yaml`](extension_config/damage-control/config.yaml). |
| `pi-boomerang` | `git:github.com/nicobailon/pi-boomerang` | Runs autonomous tasks or template chains (`/boomerang`) and rewinds intermediate turns into a compact summary. |
| `chrome-cdp-skill` | `git:github.com/vedang/chrome-cdp-skill` | Attaches to open local Chrome tabs over CDP with explicit pre-connection approval. |
| `pi-adr` | `git:github.com/vedang/pi-adr` | Workflow and Bun CLI for drafting, superseding, linking, and validating Architecture Decision Records. |
| `pi-exa` | `git:github.com/vedang/pi-exa` | Web search (`exa_search`) and URL content extraction (`exa_contents`) via Exa. |
| `pi-progress-bar` | `git:github.com/vedang/pi-progress-bar` | Passive task board (`/progress`) and footer widget backed by Jev verification and tool evidence. |
| `shaping-skills` | `git:github.com/vedang/shaping-skills` | Ryan Singer's Shape Up workflow packaged for Pi (`framing-doc`, `shaping`, `breadboarding`, `breadboard-reflection`, `kickoff-doc`). |
| `pi-interactive-shell` | `npm:pi-interactive-shell` | Full PTY and xterm emulation for interactive CLIs and background Pi sessions (`/spawn`, `/attach`, `/dismiss`). |
| `pi-intercom` | `npm:pi-intercom` | Local Unix-socket messaging between running Pi sessions (`/intercom`, `/intercom-id`). |
| `modularity` | `git:github.com/vedang/modularity` | Vlad Khononov's Balanced Coupling architecture skills (`design`, `review`, `balanced-coupling`, `document`). |

Packages parked under `"specific_packages"` in `pi-settings.json` (`pi-askuserquestion`, `pi-subagents`, `dafny-estimation`, `unravel-proposal-creator`, `denote-mono`, `thing`, `typesafe-skills`, `archify`) are inactive by default and only moved into `"packages"` when needed.

## Repository contents

### Root configuration files

| File | Description |
|------|-------------|
| [`AGENTS.md`](AGENTS.md) | Global operating rules: `jj` for VCS, `br` (`.beads/`) for issue tracking, quality gates (`make format`, `make check`, `make test`), and modular design principles. |
| [`pi-settings.json`](pi-settings.json) | Pi runtime defaults, enabled models, and active `packages` list. |
| [`pi-models.json`](pi-models.json) | Custom provider definition for local MLX inference (`mlx-community/Qwen3.8-27B-4bit`). |
| [`hermes-config.yaml`](hermes-config.yaml) | Local Hermes CLI configuration. |

### `prompts/`

Loaded via `~/.pi/agent/prompts`.

| File | Description |
|------|-------------|
| [`sharpen-communication.md`](prompts/sharpen-communication.md) | Clarifies audience, goal, and tone, then rewrites drafts using BLUF and MECE structure (`/sharpen-communication`). |
| [`orchestration-watchdog.md`](prompts/orchestration-watchdog.md) | Spawns a verified read-only background Pi ticker that wakes the coordinator session every N minutes over `pi-intercom` (`/orchestration-watchdog`). |
| [`orchestration-watchdog-stop.md`](prompts/orchestration-watchdog-stop.md) | Safely validates and dismisses the active `orchestration-watchdog-<master-id>` background session (`/orchestration-watchdog-stop`). |

### `skills/`

Checked-in local skills loaded via `~/.pi/agent/skills`.

| Skill | Description |
|-------|-------------|
| [`test-audit/`](skills/test-audit/) | Gates new tests with four boundary questions and prunes mock-heavy, duplicate, or implementation-coupled tests from existing suites. |
| [`tufte-viz/`](skills/tufte-viz/) | Applies Edward Tufte's principles (data-ink ratio, chartjunk elimination, direct labeling, small multiples) to charts and dashboards. |

### Skills provided by installed packages

Available at runtime through the active packages in [`pi-settings.json`](pi-settings.json):

| Skill | Provided by | Description |
|-------|-------------|-------------|
| `framing-doc` | `vedang/shaping-skills` | Distill conversation transcripts or stakeholder notes into a grounded Problem Framing Document. |
| `shaping` | `vedang/shaping-skills` | Iterate on problem requirements (`R`) and solution shapes (`A`, `B`, `C`) with fit checks. |
| `breadboarding` | `vedang/shaping-skills` | Map systems into UI and code affordances with wiring and vertical implementation slices. |
| `breadboard-reflection` | `vedang/shaping-skills` | Compare implemented code against an existing breadboard to find drift and update design artifacts. |
| `kickoff-doc` | `vedang/shaping-skills` | Package a shaped slice into a self-contained implementation kickoff brief. |
| `design` | `vedang/modularity` | Design modular software architectures with clean boundaries and contracts. |
| `review` | `vedang/modularity` | Review codebases and PRs for coupling problems, boundary leaks, and cascading change risks. |
| `balanced-coupling` | `vedang/modularity` | Reference model for evaluating integration strength, distance, and volatility. |
| `document` | `vedang/modularity` | Document system architecture, module responsibilities, and dependency diagrams. |
| `adr` | `vedang/pi-adr` | Create, supersede, link, and validate Architecture Decision Records. |
| `chrome-cdp` | `vedang/chrome-cdp-skill` | Inspect and interact with live local Chrome tabs over CDP. |
| `interactive-shell` | `pi-interactive-shell` | Workflow and reference for running interactive CLI programs and background Pi sessions in a PTY. |

### Inactive / reference directories

- [`specific_skills/`](specific_skills/) — Domain-specific skills (Cloudflare, Stripe, `web-perf`, `mck-consult`) kept outside `skills/` so they do not load into every session.
- [`pi-extensions/`](pi-extensions/), [`agents/`](agents/), [`chains/`](chains/) — Archived local extensions, subagent role cards, and chains not currently symlinked into `~/.pi/agent/`.
- [`claude/`](claude/) — Claude Code configuration surface (`CLAUDE.md` symlinked to `AGENTS.md`, `settings.json`, and skills); see [`docs/install-claude.md`](docs/install-claude.md).
- [`scripts/`](scripts/) — Weekly local session analysis scripts; see [`scripts/README.md`](scripts/README.md).
