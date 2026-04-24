# .config/agents

![Agents Banner](images/banner.png)

This is my Agent Harness configuration. Tell your agent to clone it to `~/.config/agents` and symlink the parts you want into your harness.

## Example setup

1. `git clone https://github.com/vedang/agents ~/.config/agents`
2. `mkdir -p ~/.pi/agent`
3. `ln -s ~/.config/agents/AGENTS.md ~/.pi/agent/AGENTS.md`
4. `ln -s ~/.config/agents/APPEND_SYSTEM.md ~/.pi/agent/APPEND_SYSTEM.md`
5. `ln -s ~/.config/agents/pi-settings.json ~/.pi/agent/settings.json`
6. `ln -s ~/.config/agents/agents ~/.pi/agent/agents`
7. `ln -s ~/.config/agents/prompts ~/.pi/agent/prompts`
8. `ln -s ~/.config/agents/pi-extensions ~/.pi/agent/extensions`
9. `ln -s ~/.config/agents/skills ~/.pi/agent/skills`

## Current Pi runtime profile

Source of truth: [`pi-settings.json`](pi-settings.json).

### Core defaults

| Setting | Value | Notes |
|---------|-------|-------|
| `defaultProvider` | `deepseek` | Primary provider. |
| `defaultModel` | `deepseek-v4-pro` | Default model for new sessions. |
| `defaultThinkingLevel` | `high` | Moderate reasoning by default. |
| `steeringMode` | `all` | Apply steering globally. |
| `followUpMode` | `one-at-a-time` | Sequential follow-up flow. |
| `hideThinkingBlock` | `false` | Show thinking block. |
| `theme` | `dark` | Base default; [`mac-system-theme.ts`](pi-extensions/mac-system-theme.ts) can override it in interactive macOS sessions. |
| `compaction.enabled` | `true` | Context compaction on. |
| `compaction.reserveTokens` | `16384` | Reserved token budget. |
| `compaction.keepRecentTokens` | `20000` | Keep recent context before compacting. |

### Enabled models

- `zai-custom/zai-glm-4.7`
- `zai-custom/glm-5-turbo`
- `zai-custom/glm-5.1`
- `openai-codex/gpt-5.5`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`

### Packages loaded from `pi-settings.json`

| Package | Source | Purpose |
|---------|--------|---------|
| `pi-askuserquestion` | `git:github.com/ghoseb/pi-askuserquestion` | Structured multi-choice questions via `ask_user_question`. |
| `pi-interactive-shell` | `npm:pi-interactive-shell` | Overlay, dispatch, and monitor workflows for interactive CLI agents. |
| `dafny-estimation` | `git:github.com/unravel-team/dafny-estimation` | Formal specification-driven project estimation skill. |
| `caveman` | `git:github.com/vedang/caveman` | Token-efficient caveman response mode plus terse helper skills. |
| `pi-boomerang` | `git:github.com/vedang/pi-boomerang` | Collapse large task context into compact summaries. |
| `pi-custom-provider-zai` | `git:github.com/vedang/pi-custom-provider-zai` | Registers ZAI-hosted GLM models as custom provider models. |
| `pi-prompt-history` | `git:github.com/vedang/pi-prompt-history` | Prompt-history search for past session inputs. |
| `pi-quizme` | `git:github.com/vedang/pi-quizme` | Quiz-style recall and change-comprehension checks. |
| `pi-ralph-loop` | `git:github.com/vedang/pi-ralph-loop` | Ralph-style autonomous planning loops via `/ralph` commands. |
| `pi-simplify-code` | `git:github.com/vedang/pi-simplify-code` | Refactor/simplify changed code without changing behavior. |
| `pi-subagents` | `git:github.com/vedang/pi-subagents` | Subagent execution, parallel work, and chain orchestration. |
| `visual-explainer` | `git:github.com/vedang/visual-explainer` | Generate self-contained HTML visual explainers. |
| `pi-read-map` | `git:github.com/Whamp/pi-read-map` | Better large-file reads with structure maps. |
| `chrome-cdp-skill` | `git:github.com/pasky/chrome-cdp-skill` | Interact with live local Chrome tabs through CDP. |
| `pi-autoresearch` | `git:github.com/davebcn87/pi-autoresearch` | Autonomous experiment loop with metrics tracking and confidence scoring. |

## Repository contents

### Root configuration files

| File | Description |
|------|-------------|
| [`AGENTS.md`](AGENTS.md) | Global workflow rules: `jj`, planning folders, tests, commits, tagref. |
| [`APPEND_SYSTEM.md`](APPEND_SYSTEM.md) | Extra system-prompt guidance layered into the harness. |
| [`pi-settings.json`](pi-settings.json) | Pi runtime defaults, enabled models, and package list. |

### `agents/` role cards

| File | Description |
|------|-------------|
| [`context-builder.md`](agents/context-builder.md) | Builds codebase context and a planner-ready meta-prompt from requirements. |
| [`multimodal.md`](agents/multimodal.md) | Reads PDFs, images, and other media for implementation details. |
| [`plan-reviewer.md`](agents/plan-reviewer.md) | Critiques plans for missing steps, bad assumptions, and risk. |
| [`planner.md`](agents/planner.md) | Turns scoped context into a concrete implementation plan. |
| [`researcher.md`](agents/researcher.md) | Runs focused web research and produces a source-backed brief. |
| [`reviewer.md`](agents/reviewer.md) | Reviews implementation quality and can make small follow-up fixes. |
| [`scout.md`](agents/scout.md) | Fast codebase recon with compressed handoff context. |
| [`worker.md`](agents/worker.md) | General-purpose implementation subagent for scoped coding work. |

### `agents/` chain workflows

| File | Description |
|------|-------------|
| [`full-workflow.chain.md`](agents/full-workflow.chain.md) | Scout → plan → review plan → implement → review. Main agent still owns tests and commits. |
| [`implement-plan.chain.md`](agents/implement-plan.chain.md) | Implement a pre-created plan, then run a review pass. Main agent still owns tests and commits. |
| [`quick-plan.chain.md`](agents/quick-plan.chain.md) | Fast scout → plan workflow without a plan review pass. |
| [`scout-and-plan.chain.md`](agents/scout-and-plan.chain.md) | Scout code, create a plan, then review the plan. |

### `prompts/`

Reusable prompt templates and operator instructions.

| File | Description |
|------|-------------|
| [`sharpen-communication.md`](prompts/sharpen-communication.md) | Rewrites communication with BLUF/MECE structure and stronger phrasing. |

### `pi-extensions/`

Checked-in local runtime extensions.

| File | Description |
|------|-------------|
| [`explanatory-output-style.ts`](pi-extensions/explanatory-output-style.ts) | Appends explanatory-output guidance to the system prompt. |
| [`handoff.ts`](pi-extensions/handoff.ts) | Adds `/handoff` to draft a focused prompt for a new session. |
| [`mac-system-theme.ts`](pi-extensions/mac-system-theme.ts) | Syncs Pi theme with macOS light/dark appearance. |
| [`notify.ts`](pi-extensions/notify.ts) | Sends terminal-native notifications when Pi is ready again. |
| [`status-line.ts`](pi-extensions/status-line.ts) | Demonstrates persistent footer status updates across session turns. |

### `skills/`

Checked-in local skills in this repo.

| Skill | Description |
|-------|-------------|
| [`docx/`](skills/docx/) | Create, edit, and analyze Word `.docx` documents. |
| [`pdf/`](skills/pdf/) | Extract, edit, merge, split, OCR, and otherwise process PDFs. |
| [`pptx/`](skills/pptx/) | Read, edit, and create PowerPoint `.pptx` decks. |
| [`skill-creator/`](skills/skill-creator/) | Create or update reusable agent skills. |
| [`xlsx/`](skills/xlsx/) | Create, edit, and validate spreadsheet outputs. |

### Skills provided by installed packages

These are available at runtime through packages in `pi-settings.json`, even though they are not stored under this repo's `skills/` directory.

| Skill | Provided by | Description |
|-------|-------------|-------------|
| `caveman` | `caveman` | Ultra-compressed communication mode for token efficiency. |
| `caveman-commit` | `caveman` | Terse Conventional Commits helper. |
| `caveman-help` | `caveman` | Quick reference for caveman commands and modes. |
| `caveman-review` | `caveman` | One-line compressed code review comments. |
| `caveman-compress` | `caveman` | Compress natural-language memory files while preserving technical content. |
| `dafny-estimation` | `dafny-estimation` | Risk-adjusted project estimation using Dafny specs. |
| `visual-explainer` | `visual-explainer` | HTML visual explainers for plans, systems, and diffs. |
| `chrome-cdp` | `chrome-cdp-skill` | Inspect and interact with live local Chrome tabs. |
| `interactive-shell` | `pi-interactive-shell` | Cheat sheet and workflow for launching TUI coding agents. |
| `codex-cli` | `pi-interactive-shell` | Codex CLI reference material. |
| `gpt-5-4-prompting` | `pi-interactive-shell` | Prompting guidance for GPT-5.4. |
| `codex-5-3-prompting` | `pi-interactive-shell` | Prompting guidance for Codex 5.3. |
