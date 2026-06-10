---
name: quizme
description: Quiz the user on what happened in this session to check their understanding of the changes, decisions, and gotchas.
disable-model-invocation: true
allowed-tools: AskUserQuestion, Read
---

Quiz the user on this session's work. If `.claude/quizme-prompt.md` exists in
the project, read it first and follow any instructions there over the defaults
below.

## Generate

Write 4–6 questions about what happened in this session, drawn from:

- Decisions made and their reasons (why X over Y)
- What changed in the code: files, functions, behavior
- Gotchas, surprises, or constraints discovered along the way
- How the pieces connect (what calls what, what depends on what)

Mix two formats:

- **Multiple choice** — exactly one correct option plus 2–3 plausible
  distractors drawn from the session (near-misses, not jokes).
- **Free text** — questions whose answer is a short explanation, not a fact
  lookup.

Skip trivia. Every question should test understanding the user needs to
maintain this work later.

## Ask

- Present multiple-choice questions with the `AskUserQuestion` tool (up to 4
  per call, one option set per question).
- Ask free-text questions conversationally, one at a time, and wait for the
  answer before continuing.

## Grade

After all answers are in, grade each one:

- **Verdict**: correct / partially correct / incorrect
- **Explanation**: the right answer with a pointer to where in the session it
  came from (file, decision, command)

Finish with a one-paragraph overall assessment: what the user has down cold
and what's worth re-reading.
