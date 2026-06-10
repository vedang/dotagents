---
name: boomerang
description: Execute a task autonomously in an isolated forked context and return only a compact summary, keeping the main conversation free of the work's token weight. Use for self-contained tasks whose intermediate steps don't matter to the ongoing conversation.
argument-hint: "<task>"
context: fork
agent: general-purpose
---

Execute this task autonomously:

$ARGUMENTS

Rules:

- Work without asking questions. Make reasonable assumptions and note them in
  the summary instead of stopping.
- Follow the global instructions in CLAUDE.md (jj hygiene, quality gates),
  except: do NOT commit — leave that to the main conversation.
- Stay within the task's scope; no opportunistic refactors.

Your final message is the only thing the main conversation will see. Make it
this compact summary and nothing else:

```markdown
## Boomerang: <task in a few words>
**Outcome:** done | partial | blocked — one sentence.
**Changes:** file paths with one-line notes (or "none").
**Commands run:** the ones worth re-running for verification.
**Assumptions:** any decisions made without asking.
**Follow-ups:** what the main agent or user still needs to do (or "none").
```
