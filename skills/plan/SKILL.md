---
name: plan
description: Solo-native planning workflow. Use when asked to "plan", "brainstorm", "design", "create a plan", "I want to build", or "let's build". Runs a scout, opens an interactive planner, creates Solo todos, then executes and reviews through Solo subagents and scratchpads.
---

# Plan

Run a Solo-native planning workflow. Use Solo subagents, Solo scratchpads, and Solo todos.

## Flow

1. Quick assessment in the parent session.
2. Spawn a Solo scout and wait for Solo to wake the parent.
3. Read the scout scratchpad.
4. Spawn an interactive Solo planner with the scout context.
5. When the planner has produced a plan, read the planner scratchpad and list the generated Solo todos.
6. Ask the user whether to execute.
7. Execute todos sequentially with Solo workers.
8. Run a Solo reviewer and triage findings.

Solo subagents are asynchronous. After every `subagent` call, stop and wait for Solo to inject the wake-up turn. Do not poll, guess, or fabricate child results.

## Phase 1: Quick Assessment

Spend about 30 seconds orienting:

```bash
ls -la
find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) | head -40
cat package.json 2>/dev/null | head -60
```

Pick a short plan tag such as `auth-redesign`. Use that tag for scratchpad names and todo tags.

## Phase 2: Scout

Always run a scout before the planner.

```typescript
subagent({
  name: "Scout: <tag>",
  agent: "scout",
  scratchpad: true,
  task: `Scout for this planning request: <user request>

Focus on the files, patterns, conventions, tests, and gotchas a planner needs before designing the change.
Save your findings to your pre-created Solo scratchpad. Use tag: <tag>.`
})
```

Then stop. When Solo wakes the parent, read the scout scratchpad from the wake-up message with `scratchpad_read`.

## Phase 3: Interactive Planner

Spawn the planner only after reading the scout findings.

Before spawning the planner, get this parent session's Solo process id so the planner can notify the parent after it finishes the plan and todos:

```typescript
solo_tool({ action: "call", name: "whoami", arguments: {} })
```

Pass the returned `process_id` into the planner task as `Parent Solo process id`. If `whoami` is unavailable or the parent is not Solo-managed, say that parent notification is unavailable and omit that line.

```typescript
subagent({
  name: "Planner: <tag>",
  agent: "planner",
  interactive: true,
  scratchpad: true,
  task: `Plan this request: <user request>

Plan tag: <tag>
Parent Solo process id: <parent process_id from whoami>
Scout scratchpad: <scratchpad name/id>
Scout findings:
<paste concise scout findings or provide the scratchpad id>

Work interactively with the user in your Solo pane. Save the final plan to your pre-created Solo scratchpad, create Solo todos tagged: <tag>, and notify the parent when the todos are ready.`
})
```

Tell the user to continue the planning conversation in the planner pane. The first interactive wake-up only means the planner is waiting for the user; do not treat it as completion unless the planner scratchpad contains a final plan and the todos exist. When the planner later notifies the parent that todos are ready, read the planner scratchpad and list the tagged todos.

## Phase 4: Review Plan and Todos

When the planner finishes:

1. Read the plan scratchpad with `scratchpad_read`.
2. List todos with `todo_list({ tags: ["<tag>"], completed: false })`.
3. Summarize the plan, todo count, effort level, and key decisions.
4. Ask: “Ready to execute these todos sequentially?”

Do not execute until the user confirms.

## Progress Notifications

During execution, the parent/orchestrator should send human-facing progress notifications. Do not add notification work to worker or reviewer prompts.

Use Solo terminal notifications because Pi's own tool output does not trigger Solo's notification path. After the user confirms execution, create one disposable notification terminal and keep its process id for the run:

```typescript
solo_tool({
  action: "call",
  name: "spawn_process",
  arguments: { kind: "terminal", name: "Plan Notifications: <tag>" },
  reason: "create notification terminal for plan progress"
})
```

Send notifications through that terminal with OSC 777:

```typescript
solo_tool({
  action: "call",
  name: "send_input",
  arguments: {
    process_id: <notification process_id>,
    input: "printf '\\033]777;notify;Solo Plan;Worker 1/5 done: <todo title>\\007'"
  },
  reason: "send plan progress notification"
})
```

Keep titles and bodies short. Before inserting dynamic todo titles, replace semicolons, newlines, and single quotes with spaces or plain punctuation so the shell command stays valid. If notification setup fails, continue the workflow and mention that notifications were unavailable.

Notify at these points:

- Execution starts: `Starting execution: <N> todos`.
- Each worker completes after its scratchpad and todo state have been checked: `Worker <i>/<N> done: <todo title>`.
- A worker is blocked or needs input: `Worker <i>/<N> needs attention: <todo title>`.
- Review starts: `Starting review for <tag>`.
- Review finishes and findings are triaged: `Review finished for <tag>`.
- Workflow completes: `Plan complete: <tag>`.

After the final completion notification, close the disposable notification terminal:

```typescript
solo_tool({
  action: "call",
  name: "close_process",
  arguments: { process_id: <notification process_id> },
  reason: "close plan notification terminal"
})
```

## Phase 5: Execute Todos

Run workers one todo at a time. Parallel workers in one git repo will conflict.

```typescript
subagent({
  name: "Worker: <todo id>",
  agent: "worker",
  scratchpad: true,
  task: `Implement Solo todo <todo id>.

Plan scratchpad: <planner scratchpad id/name>
Scout scratchpad: <scout scratchpad id/name>
Plan tag: <tag>

Read the todo through solo_tool using gateway-only todo_get with include_comments: true, implement it, verify it, commit using the commit skill, save your result to your pre-created Solo scratchpad, and mark the todo complete.`
})
```

After each worker wake-up:

1. Read the worker scratchpad.
2. Check the todo through `solo_tool` using gateway-only `todo_get`.
3. If complete, send `Worker <i>/<N> done: <todo title>` through the notification terminal, then start the next worker.
4. If blocked or missing context, send `Worker <i>/<N> needs attention: <todo title>`, update the todo with `todo_update` to add the missing examples or constraints, then rerun a worker.

## Phase 6: Review

After all implementation todos are complete, send `Starting review for <tag>` through the notification terminal, then run the reviewer:

```typescript
subagent({
  name: "Reviewer: <tag>",
  agent: "reviewer",
  scratchpad: true,
  task: `Review the recent changes for plan tag <tag>.

Plan scratchpad: <planner scratchpad id/name>
Scout scratchpad: <scout scratchpad id/name>
Review the implementation commits and save your review to your pre-created Solo scratchpad.`
})
```

Read the reviewer scratchpad and triage:

- P0/P1: create or update Solo todos and run workers to fix.
- P2: fix if quick, otherwise note.
- P3: skip unless the user asks.

After triage, send `Review finished for <tag>`. When the full workflow is complete, send `Plan complete: <tag>` and close the disposable notification terminal.

## Completion Checklist

Before reporting completion:

- [ ] Scout ran before planner.
- [ ] Scout scratchpad was read and passed to planner.
- [ ] Planner scratchpad contains the final plan.
- [ ] Todos are Solo todos tagged with the plan tag.
- [ ] Workers ran sequentially.
- [ ] Each completed worker saved a Solo scratchpad artifact.
- [ ] Progress notifications were sent by the parent/orchestrator when the notification terminal was available.
- [ ] Relevant verification commands ran and outputs were checked.
- [ ] Commits were made with the `commit` skill when code changed.
- [ ] Reviewer ran and findings were triaged.
