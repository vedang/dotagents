---
name: quick-plan
description: Quickly gather context and create a plan without a review pass
---

## scout
output: context.md

Analyze the codebase for {task}

## planner
reads: context.md
output: plan.md
progress: true

Create an implementation plan based on {previous}

---
Usage: pass `chainDir`.
