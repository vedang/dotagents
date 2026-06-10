# Claude compatibility plan: pi-quizme

> **Status (2026-06-10): done.** Implemented as the AskUserQuestion-based skill claude/skills/quizme/.

Source: `~/src/vedang/pi-quizme/pi-quizme.root`

## Current shape (pi)

TS extension: `/quizme` builds a quiz from the session history (LLM call via
`completeSimple`), renders an interactive quiz panel (MCQ/free-text,
navigation, grading), grades answers with a second LLM call, and offers a
quiz on `session_shutdown`. Prompt overrides in
`.pi/extensions/quizme/prompt.md`; debug snapshots in `~/.pi/debug/quizme/`.

## Port assessment

Portable as a pure skill — Claude Code gives the model the conversation, an
LLM, and `AskUserQuestion` for interactive MCQs, so no extension code or
custom UI is needed. The `session_shutdown` auto-offer has no interactive
Claude equivalent (SessionEnd hooks can't prompt); drop it.

## Changes

1. Ship `skills/quizme/SKILL.md` (`disable-model-invocation: true`):
   - Generate 4–6 questions about what happened in this session (decisions,
     code changes, gotchas), mixing MCQ and free-text — reuse the bundled
     `prompt.md` instructions as the skill body.
   - Ask MCQs via the built-in `AskUserQuestion` tool (up to 4 at a time);
     collect free-text answers conversationally.
   - Grade answers and present a verdict + explanation per question — reuse
     the existing grading rubric text.
2. Prompt overrides: keep supporting a project-level override by instructing
   the skill to read `.claude/quizme-prompt.md` if present.
3. Delete/park the TUI panel, `completeSimple` plumbing, model/auth
   resolution, and shutdown hook — all subsumed by the host model.
4. Keep the repo dual-format: pi extension untouched, new `skills/quizme/`
   readable by both harnesses (pi will simply use the skill too if you prefer
   to retire the extension later).

## Effort

Small–medium (half a day): the skill is mostly the existing prompts
reassembled.
