---
name: implement-plan
description: Implement a pre-created plan, then run a review pass. The main agent still owns tests and commits.
---

## worker
progress: true

Implement the plan specified in {task}

## reviewer
progress: true

Review the implementation against the plan from {previous} and fix any issues that do not require new or changed tests

---
Usage: pass `chainDir`. This chain assumes the main agent handles any needed failing tests and the final commit.
