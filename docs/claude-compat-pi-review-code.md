# Claude compatibility plan: pi-review-code

Source: `~/src/vedang/pi-review-code/pi-review-code.root`

## Current shape (pi)

TS extension with a three-stage flow: meta-pass builds a review prompt →
user edits it in a widget → review runs on an isolated branch with
`add_review_comment` collecting findings → `/review-fix` applies selected
findings. Targets: free-form, diff-vs-ref, GitHub PRs (`gh`), GitLab MRs
(`glab`). Reads `REVIEW_GUIDELINES.md` from the repo root.

## Port assessment

Claude Code ships `/code-review` (with effort levels, `--comment`, `--fix`,
and an `ultra` multi-agent cloud mode) and `/security-review`, which replace
the bulk of this extension. The pieces worth carrying over are the
guidelines file and any house review dimensions.

## Changes

1. **Adopt built-ins first.** Use `/code-review [low|medium|high|max|ultra]`
   and `/code-review <PR#>`; `--fix` replaces `/review-fix`.
2. **Carry the guidelines.** Two options:
   - Put a "Code review" section in the project `CLAUDE.md` (or
     `.claude/rules/review.md`) referencing `REVIEW_GUIDELINES.md`, so all
     review paths see it; or
   - Ship a thin `skills/review/SKILL.md` wrapper that reads
     `REVIEW_GUIDELINES.md` (if present) and then invokes the built-in
     review flow with those guidelines prepended.
3. **GitLab support** is the one real gap (`/code-review ultra` targets
   GitHub PRs). If MR review matters, keep a `skills/review-mr/SKILL.md`
   that shells out to `glab mr diff`/`glab mr view` and runs the review on
   that diff; the existing `src/gitlab.ts` logic translates into skill
   instructions plus `glab` calls.
4. Drop: meta-pass widget (edit the prompt inline instead), isolated review
   branches (`session_before_tree`), custom renderers, and the
   `add_review_comment` tool — built-in review handles finding collection.

## Effort

Small (hours) for the built-in adoption + guidelines wiring; +half a day if
the GitLab MR skill is needed.
