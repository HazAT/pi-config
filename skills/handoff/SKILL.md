---
name: handoff
description: Start a fresh Solo Pi session from the current conversation. Use when asked to hand off, continue in a clean context, or run `/handoff <new prompt>`. Writes a Solo scratchpad summary of the important current-session context, then launches an interactive Solo agent in the same project with that handoff and the new prompt.
---

# Handoff

Create a clean continuation session without losing the important context from the current conversation.

Use Solo primitives only: write the handoff as a Solo scratchpad and launch the continuation as an interactive Solo agent pane through `subagent`.

## Inputs

The user should provide a continuation prompt, usually through:

```text
/handoff <what the fresh session should do next>
```

If the continuation prompt is empty or ambiguous, ask one concise clarifying question before writing the scratchpad or launching anything.

## Workflow

1. Identify the continuation prompt from the user message.
2. Pick a short slug for the work, such as `auth-cleanup` or `release-fix`.
3. Write a Solo scratchpad named `handoff/<timestamp>-<slug>` with the context summary.
4. Launch an interactive fresh Pi session in the same Solo project using `subagent` with the global `handoff` agent.
5. Stop in the parent session after launch. Do not continue doing the actual work in the old context.

## Handoff Scratchpad Content

Use `scratchpad_write` directly. The scratchpad should be concise but complete enough for a fresh agent to continue without reading the old transcript.

Use this shape:

```markdown
# Handoff: <short title>

## Continuation Prompt
<the exact user prompt for the fresh session>

## Current Goal
<what we are trying to accomplish overall>

## What Happened
- <important actions already taken>
- <files created/edited/read if relevant>
- <commands run and meaningful results>

## Decisions and Rationale
- <decision> — <why>

## Current State
- <what is true now>
- <known uncommitted changes, todo state, branch/PR state, running processes, or artifacts>

## Important Context
- <constraints, conventions, user preferences, architectural notes>
- <links to relevant Solo scratchpads/todos/subagents by id/name>

## Risks / Gotchas
- <things the next agent must not miss>

## Suggested Next Steps
1. <first concrete step>
2. <second concrete step>
```

Rules:

- Do not include secrets, tokens, private keys, or credentials. Redact if they appeared.
- Do not invent details. If a detail is uncertain, say so explicitly.
- Prefer precise references over vague statements: file paths, commands, todo ids, scratchpad ids, branch names, error text.
- Keep it readable. Aim for high signal, not transcript dumping.

## Launch the Fresh Session

After `scratchpad_write` returns, launch the continuation with:

```typescript
subagent({
  name: "Handoff: <slug>",
  agent: "handoff",
  interactive: true,
  scratchpad: false,
  task: `You are taking over from an earlier Pi session in the same project.

Handoff scratchpad: "<scratchpad name>" (id <scratchpad id if available>).

Read the handoff scratchpad first if you need the canonical saved copy. The key handoff context is also included below so you can begin immediately.

<handoff scratchpad content>

Continuation request:
<exact continuation prompt>

Continue from this handoff in this fresh session. Preserve the decisions and constraints above, verify before claiming success, and ask only if required context is missing.`
})
```

The child is interactive: after its first turn, the user can continue in that Solo pane. The parent may receive a wake-up when the child becomes idle; do not close the pane automatically.

## Parent Session Final Response

After launching, give the user only:

- The handoff scratchpad name/id.
- The new Solo agent pane/process id if the `subagent` result includes it.
- A note to continue in the new handoff pane.

Do not proceed with the continuation work in the parent session.
