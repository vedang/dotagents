# Claude compatibility plan: caveman, humanizer, rote-skills

These three repos are pure skill packages (no TypeScript extension code), so
they are already Claude Code compatible in substance. The work is packaging,
not porting.

## caveman (`github.com/vedang/caveman`)

Single skill (`caveman/SKILL.md`) plus terse helper skills
(`caveman-commit`, `caveman-help`, `caveman-review`, `caveman-compress`).
Stateless prompt injection; nothing pi-specific in the bodies.

Changes:

1. Add a Claude plugin manifest so it installs with one command:
   - `.claude-plugin/plugin.json` with `name: caveman`.
   - Move/alias skills under `skills/<name>/SKILL.md` (the Agent Skills
     layout both harnesses read).
2. Add a `marketplace.json` (or register in a personal marketplace repo) so
   `/plugin install caveman@vedang` works.
3. Verify each `SKILL.md` `name:` matches its parent directory — Claude
   validates this more strictly than pi.
4. Until then, a checkout symlinked into `~/.claude/skills/` works as-is.

## humanizer (`github.com/vedang/humanizer`)

Single skill, already declares `compatibility: claude-code opencode` and uses
Claude tool names in `allowed-tools` (Read, Write, Edit, Grep, Glob,
AskUserQuestion). Nothing to change functionally.

Changes:

1. Same plugin packaging as caveman (manifest + marketplace entry).
2. Optional: drop `version` from frontmatter into `plugin.json` so the plugin
   system owns versioning.

## rote-skills (`github.com/vedang/rote-skills`)

Already dual-format: ships `plugins/rote-onboard/` with five skills and
installs into Claude Code via `claude plugin install rote-onboard@rote-skills`.

Changes: none required. Keep the Claude plugin path as the primary install
and treat the pi package manifest as the secondary format.
