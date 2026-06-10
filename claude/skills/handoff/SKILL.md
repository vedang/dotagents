---
name: handoff
description: Draft a focused, self-contained prompt that transfers the relevant context of this session to a fresh session targeting a specific goal.
argument-hint: "<goal for the new session>"
disable-model-invocation: true
---

Create a handoff prompt for a new session with this goal:

$ARGUMENTS

Steps:

1. Review the current conversation and extract only what the new session needs to pursue the goal: the task state, key decisions and their reasons, exact file paths touched, commands that matter, open problems, and sharp constraints. Drop dead ends and superseded details.
2. Write a self-contained prompt — it must make sense to an agent with no access to this conversation. Structure:

   ```markdown
   # Goal
   [the goal above, stated crisply]

   # Context
   [what happened so far that matters; decisions and why]

   # Relevant files
   [exact paths, with one-line notes]

   # Constraints
   [rules, gotchas, things already ruled out]

   # First step
   [the concrete starting action]
   ```

3. Save it to `.agents/handoff-YYYYMMDDThhmmss.md` (or `/tmp/` if the cwd is not writable).
4. Show the user the saved path and tell them to start the new session with it, e.g.:
   `claude "$(cat <path>)"`
