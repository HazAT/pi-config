---
name: write-todos
description: Write clear Solo todos that workers can execute without losing architectural intent. Use when asked to "create todos", "write todos", "break into tasks", "plan todos", or create work items from a plan. Ensures each todo has outcomes, examples, constraints, and verification criteria.
---

# Write Solo Todos

Write Solo todos that a worker can execute from the todo body, plan scratchpad, and referenced code. Every todo must preserve the architectural intent from the plan.

## Todo Body Template

```markdown
**Plan scratchpad:** [name/id]
**Scout scratchpad:** [name/id if relevant]
**Depends on:** [todo ids or "none"]

## What
[One paragraph: what this todo produces and why]

## Constraints
- [Architectural constraints]
- [Libraries/patterns to use]
- [Anti-patterns to avoid]

## Files
- `path/to/file` — [what changes]

## References
- `path/to/example.ts:10-45` — [pattern to follow]

## Expected Shape
```typescript
// Short code sketch with imports and structure when no existing reference is enough
```

## Acceptance Criteria
- [ ] [Specific, verifiable criterion]
- [ ] [Command/test/check passes]
```

## Rules

### Make Constraints Explicit

Repeat every relevant plan decision in the todo body. Do not rely on the worker reading between the lines.

| Weak | Strong |
|---|---|
| "Build the service" | "Build an Effect service using `Context.Tag` and `Layer`; do not use a plain class singleton." |
| "Add WebSocket support" | "Use the `ws` package; do not introduce Socket.IO." |
| "Create the component" | "Use React 19 and Tailwind v4 utilities; no CSS modules." |

### Include a Code Example or Existing Reference

Every todo needs one of:

1. An inline code sketch showing imports, types, and structure.
2. A precise existing file reference with line range and what to copy.

### Name Anti-Patterns

If a wrong approach looks plausible, name it:

```markdown
## Constraints
- Use the existing repository abstraction in `src/db/repository.ts`.
- Do not add direct SQL calls in route handlers.
- Do not create a second cache layer.
```

### Keep Todos Focused

One todo should fit one worker session and one commit. Split work when a todo touches unrelated behavior, has more than a few files, or needs separate verification.

### Make Acceptance Criteria Verifiable

Use commands, file checks, API responses, screenshots, or exact behavior.

| Weak | Strong |
|---|---|
| "Code is clean" | "`npm run typecheck` passes" |
| "Works correctly" | "Submitting the form shows the success toast and creates one network request" |
| "Follows conventions" | "Imports come from `effect`; no `new Service()` appears" |

## Creating Todos

Use `todo_create`. Tag every todo with the plan tag.

Before creating each todo, verify:

- [ ] Plan scratchpad is referenced.
- [ ] Todo is independently implementable.
- [ ] Constraints and anti-patterns are explicit.
- [ ] Code example or exact reference is present.
- [ ] Dependencies are listed.
- [ ] Acceptance criteria are objective.
- [ ] The todo is small enough for one worker and one commit.
