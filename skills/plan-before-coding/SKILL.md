---
name: plan-before-coding
description: |
  Applies when starting a larger feature or project that involves significant coding.
  Before implementing: check working directory, brainstorm, then write a detailed plan
  with a task breakdown that could be handed off to sub-agents.
---

# Plan Before Coding

For larger coding work, follow this workflow before touching code.

## When This Applies

- Building a new feature (not a quick fix)
- Starting a new project
- Significant refactoring
- Multi-file changes
- Anything that benefits from a plan

Does NOT apply to:
- Quick bug fixes
- Small tweaks
- Single-file changes
- Direct, specific tasks

## Workflow

### 1. Check Location

Before diving in, verify we're in the right place:

```
Current directory: {cwd}
```

Ask yourself:
- Is this the right project directory?
- Does a project exist here, or do we need to create one?
- Should we `cd` somewhere else first?

If unclear, ask:
> "I see we're in `{cwd}`. Is this where you want to build this, or should we set up a project directory first?"

### 2. Brainstorm & Ask Questions

Use the `think-before-building` skill:
- Understand the intention
- Explore approaches
- Ask meaningful questions (one at a time!)
- Align on scope and direction

### 3. Write the Plan

Once aligned, create a plan file:

```
.pi/plans/YYYY-MM-DD-[plan-name].md
```

Example: `.pi/plans/2026-01-31-auth-system.md`

### Plan Structure

```markdown
# [Plan Name]

**Date:** YYYY-MM-DD  
**Status:** Draft | In Progress | Complete  
**Directory:** /path/to/project

## Overview

Brief description of what we're building and why.

## Goals

- Goal 1
- Goal 2
- Goal 3

## Approach

High-level approach and key decisions made during brainstorming.

### Key Decisions

- Decision 1: [choice] — because [reason]
- Decision 2: [choice] — because [reason]

### Architecture / Structure

Describe the structure, components, or architecture.

## Dependencies

- External libraries needed
- Tools required
- Environment setup

## Risks & Open Questions

- Risk/question 1
- Risk/question 2

---

## Implementation Tasks

Detailed breakdown of work. Each task should be:
- **Self-contained** — could be done independently
- **Specific** — clear what "done" looks like
- **Contextual** — includes enough detail to hand off

### Task 1: [Task Name]

**Description:** What needs to be done  
**Files:** List of files to create/modify  
**Details:**
- Step-by-step if needed
- Important considerations
- Acceptance criteria

### Task 2: [Task Name]

...

### Task N: [Task Name]

...

---

## Notes

Space for additional notes, links, references.
```

## Why This Matters

1. **Clarity** — Forces us to think before coding
2. **Reference** — Can come back to the plan later
3. **Sub-agents** — Task list can be handed to sub-agents for parallel work
4. **History** — Plans in `.pi/plans/` create a project history

## After Writing the Plan

1. Confirm the plan looks good with the user
2. Ask if they want to start with Task 1, or hand off tasks
3. Begin implementation following the task list
