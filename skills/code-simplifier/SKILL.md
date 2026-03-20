---
name: code-simplifier
description: Simplifies and refines code for clarity, consistency, and maintainability while preserving functionality. Use when asked to "simplify code", "clean up code", "refactor for clarity", "improve readability", or review recently modified code for elegance. Focuses on project-specific best practices and local-first execution.
license: Adapted from getsentry/skills
---

<!--
Adapted from Anthropic's code-simplifier guidance:
https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md
-->

# Code Simplifier

Simplify code without changing behavior. Use local reasoning first and escalate to a stronger hosted model only for broad, high-risk refactors or ambiguous design tradeoffs.

## Routing Guidance

| Prefer local when... | Escalate when... |
|---|---|
| The scope is a small or medium cleanup. | The cleanup spans many modules with intertwined behavior. |
| The desired end state is already clear from the codebase. | You need stronger synthesis to compare competing designs. |
| You can verify behavior with existing tests quickly. | The change is risky enough that an extra high-quality reasoning pass is justified. |

## Refinement Principles

### 1. Preserve Functionality

Never change what the code does—only how it does it. Keep features, outputs, side effects, and observable behavior intact unless the user explicitly asks for a behavior change.

### 2. Apply Project Standards

Read the project convention files that apply to the edited paths, then follow those standards instead of inventing new ones.

Examples of standards to honor when they exist:
- module and import ordering conventions
- typing and function declaration preferences
- component structure and state-management patterns
- error-handling patterns already used in the project
- naming, testing, and formatting conventions

### 3. Enhance Clarity

Simplify code structure by:
- reducing unnecessary complexity and nesting
- eliminating redundant code and one-off abstractions
- improving readability with clearer names
- consolidating closely related logic
- removing comments that only restate obvious code
- avoiding nested ternaries when a straightforward `if`/`else` chain is clearer
- choosing clarity over brevity

### 4. Maintain Balance

Do not over-simplify in ways that:
- make the code more clever and less readable
- collapse multiple concerns into one function
- remove abstractions that still earn their keep
- optimize for fewer lines instead of maintainability
- make debugging or future edits harder

### 5. Focus Scope

Only refine code that was recently modified or that the user explicitly asked you to review. Avoid opportunistic refactors outside the working area.

## Refinement Process

1. Identify the code in scope.
2. Read surrounding files to understand the local pattern.
3. Decide which simplifications genuinely improve clarity.
4. Apply the smallest set of edits that achieves the improvement.
5. Verify that behavior is unchanged with targeted checks.
6. Summarize only the meaningful design or readability changes.

## Examples

### Before: Nested ternaries

```typescript
const status = isLoading ? 'loading' : hasError ? 'error' : isComplete ? 'complete' : 'idle';
```

### After: Clear conditional flow

```typescript
function getStatus(isLoading: boolean, hasError: boolean, isComplete: boolean): string {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (isComplete) return 'complete';
  return 'idle';
}
```

### Before: Overly compact pipeline

```typescript
const result = arr.filter(x => x > 0).map(x => x * 2).reduce((a, b) => a + b, 0);
```

### After: Clear intermediate steps

```typescript
const positiveNumbers = arr.filter(x => x > 0);
const doubledNumbers = positiveNumbers.map(x => x * 2);
const total = doubledNumbers.reduce((a, b) => a + b, 0);
```
