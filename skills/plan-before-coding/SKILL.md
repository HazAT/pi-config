---
name: plan-before-coding
description: |
  Applies when starting a larger feature or project that involves significant coding.
  Before implementing: check working directory, brainstorm, write a detailed plan,
  then create todos for each task. Todos enable parallel work and sub-agent handoffs.
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
- Ask meaningful questions
- Align on scope and direction

**When you have multiple questions:** Format them clearly with `?` endings, then use `execute_command` to self-invoke `/answer`:

```
[After listing your questions]
execute_command(command="/answer", reason="Opening Q&A interface for planning questions")
```

The `/answer` tool extracts questions from your message and presents an interactive UI for the user to answer each one efficiently. Don't make the user answer inline — invoke it yourself.

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
```

### 4. Create Todos for Each Task

After the plan is written, **create a todo for each implementation task** using the `todo` tool:

```
todo(action: "create", title: "Task 1: Setup project structure", tags: ["plan-name"], body: "...")
todo(action: "create", title: "Task 2: Implement auth module", tags: ["plan-name"], body: "...")
```

**Todo body should include:**
- Reference to the plan file: `Plan: .pi/plans/2026-01-31-auth-system.md`
- What needs to be done
- Files to create/modify
- Acceptance criteria
- Any dependencies on other tasks

**Example todo body:**
```markdown
Plan: .pi/plans/2026-01-31-auth-system.md

## Task
Implement the JWT token validation middleware.

## Files
- src/middleware/auth.ts (create)
- src/types/auth.ts (create)

## Details
- Use jsonwebtoken library
- Extract token from Authorization header
- Validate against JWT_SECRET env var
- Attach decoded user to request object

## Acceptance Criteria
- [ ] Middleware rejects invalid tokens with 401
- [ ] Middleware attaches user to req.user
- [ ] Tests pass

## Depends On
- Task 1 (project setup) must be complete
```

### 5. Confirm and Ask About Execution

After creating todos, ask the user:

> "I've created the plan and X todos. How would you like to proceed?
> 
> 1. **Work through them together** — I'll work on each task, you review
> 2. **Hand off to sub-agents** — I'll claim todos and you can spawn sub-agents to work on them
> 3. **Just the plan for now** — We'll come back to implementation later"

## Working with Todos

### When to Claim Todos

**Claim a todo** (`todo(action: "claim", id: "...")`) when:
- You're about to start working on it yourself
- User explicitly asks to hand off to sub-agents (claim it for that session)
- You want to signal "this is in progress"

**Don't claim** if:
- Just creating the plan/todos
- User hasn't decided on execution approach yet
- Another session might work on it

### During Implementation

When working on a task:
1. **Claim it first** — `todo(action: "claim", id: "TODO-xxxx")`
2. **Append progress notes** — `todo(action: "append", id: "...", body: "Started implementation...")`
3. **Close when done** — `todo(action: "update", id: "...", status: "closed")`

### Listing Todos

Use `/todos` to see the visual todo manager, or:
- `todo(action: "list")` — see open and assigned todos
- `todo(action: "list-all")` — include closed todos
- `todo(action: "get", id: "...")` — see full details of a todo

## Why This Matters

1. **Clarity** — Forces us to think before coding
2. **Trackable** — Todos persist and show progress
3. **Parallel work** — Sub-agents can claim and work on different todos
4. **Handoff ready** — Each todo has full context for independent execution
5. **History** — Plans + todos create a project history

## Summary

```
Brainstorm → Plan (.pi/plans/) → Todos (.pi/todos/) → Claim → Work → Close
```
