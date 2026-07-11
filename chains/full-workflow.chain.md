---
name: full-workflow
description: Gather context, create a plan, implement it, and run a review pass. The main agent still owns tests and commits.
---

## scout
output: context.md

Analyze the codebase for {task}

## planner
reads: context.md
output: plan.md
progress: true

Create an implementation plan based on {previous}

## plan-reviewer
reads: plan.md
progress: true

Review the implementation plan from {previous}

## worker
reads: plan.md
progress: true

Implement the plan from {previous}

## reviewer
reads: plan.md
progress: true

Review the implementation against the plan and fix any issues that do not require new or changed tests

---
Usage: pass `chainDir`. This chain assumes the main agent handles any needed failing tests and the final commit.
