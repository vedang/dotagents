# Claude compatibility plan: pi-adr

Source: `~/src/vedang/pi-adr/pi-adr.root`

## Current shape (pi)

- `skills/adr/SKILL.md` — guidance for creating/reviewing Nygard-style ADRs,
  with references (`references/*.md`) and templates (`assets/*.md`).
- Deterministic helper CLI: `scripts/adr.ts` (`bun run adr init|new|...`)
  for validation, slugs, directory discovery (`.adr-dir`, `doc/adr`),
  supersession links, reports.
- No extension code, no pi events. Skills-first design.

## Port assessment

Drop-in portable. The skill is plain markdown and the CLI is plain bun/TS.
Claude Code skills can ship scripts next to `SKILL.md` and reference them via
`${CLAUDE_SKILL_DIR}`.

## Changes in the pi-adr repo

1. **Make the script path harness-agnostic.** In `SKILL.md`, invoke the CLI
   as `bun run ${CLAUDE_SKILL_DIR}/scripts/adr.ts ...` when available, with a
   plain relative-path fallback for pi. Simplest: instruct the agent to
   resolve the skill directory first, then call `bun run <skill-dir>/scripts/adr.ts`.
2. **Plugin packaging.** Add `.claude-plugin/plugin.json` (`name: adr`) and
   keep skills under `skills/adr/`. Skills, references, and assets need no
   content changes.
3. **Frontmatter check.** Keep `name: adr` (matches dir) and the existing
   `description`. Optionally add `argument-hint: "[new <title> | review | report]"`
   so `/adr` reads well as a slash command.
4. **CI**: add a smoke test that runs `bun run adr --help` so plugin installs
   fail loudly when bun is missing; document bun as a prerequisite in README.

## Effort

Small (hours). No logic changes.
