---
name: ralph
description: Run a Ralph-style autonomous iteration loop against a plan — one scoped item per iteration, quality gates every pass, explicit stop conditions. Use with /loop for unattended multi-iteration runs.
argument-hint: "<plan file | TASK_DIR | unit-tests | clean-room <spec>>"
disable-model-invocation: true
---

Run one Ralph iteration against this target:

$ARGUMENTS

## Resolve the target (first iteration only)

- A path to a `plan.md` or a `TASK_DIR` under `.agents/plans/`: use it.
- `unit-tests`: create a `TASK_DIR` (`.agents/plans/YYYYMMDDThhmmss--<four-word-name>__inprogress/`)
  with a `plan.md` whose items are: run the test suite, list every failing or
  missing-coverage area as a checklist item, then fix one item per iteration
  until the suite is green.
- `clean-room <spec>`: create a `TASK_DIR` with `spec.md` holding the spec and
  a `plan.md` decomposing it into ordered, independently verifiable items.
- Anything else: treat it as a task description and decompose it into a fresh
  `TASK_DIR/plan.md` the same way.

Ensure `TASK_DIR/progress.md` exists.

## Iteration contract (every iteration)

1. Read `plan.md` and `progress.md`. Pick the FIRST unchecked item. Do not
   work on more than one item per iteration.
2. Implement that item only. Delegate scoped implementation to a subagent
   when it keeps the main context small; review its output.
3. Run the quality gates (`make format`, `make check`, `make test`, or the
   repo-native equivalents).
4. Update `plan.md` (check the item off) and append to `progress.md`: what
   was done, gate results, anything learned that affects later items.
5. Commit the iteration with `jj desc` + `jj new` per the global workflow.

## Stop conditions

Stop the loop (and say so explicitly, with the reason) when:

- every item in `plan.md` is checked — rename `TASK_DIR` suffix to
  `__completed`;
- the same item has failed in two consecutive iterations — record the
  blocker in `progress.md` and stop rather than thrash;
- an item requires a decision only the user can make.

## Driving the loop

For unattended runs, start this skill under `/loop` (dynamic pacing), e.g.
`/loop /ralph <TASK_DIR>`. Each loop firing runs exactly one iteration of the
contract above; the stop conditions tell the loop when to end.
