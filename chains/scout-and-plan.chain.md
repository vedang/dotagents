---
name: scout-and-plan
description: Gather context, create a plan, and review the plan
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

---
Usage: pass `chainDir`.
