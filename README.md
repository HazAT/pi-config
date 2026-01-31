# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills and extensions that shape how pi works for me.

## Install

```bash
pi install git:github.com/HazAT/pi-config
```

## Update

```bash
pi update
```

## Skills

| Skill | What it does |
|-------|--------------|
| **self-improve** | Learn new behaviors from natural language — "Hey pi, remember that..." |
| **auto-memory** | Automatically remember facts about environment, projects, and gotchas |
| **think-before-building** | Explore the codebase and brainstorm before jumping to implementation |
| **plan-before-coding** | For larger projects: check location, brainstorm, write detailed plans with tasks |
| **thoughtful-questions** | Ask one meaningful question at a time, not a list |
| **try-before-asking** | Try running commands instead of asking if tools are installed |
| **reload-after-skill** | After creating a skill, prefill `/reload` for instant activation |
| **test-as-you-build** | Verify work as you go with lightweight tests |

## Extensions

| Extension | What it does |
|-----------|--------------|
| **memory.ts** | Persistent memory system — global (`~/.pi/memory.md`) and per-project (`.pi/memory.md`) |
| **prefill-editor.ts** | Tool to prefill the input editor (powers the reload-after-skill flow) |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **todos.ts** | `/todos` command — file-based todo management in `.pi/todos/` with locking, assignments, and TUI |

## Philosophy

These skills teach pi to:
- **Think first** — brainstorm and explore before coding
- **Learn continuously** — remember facts and adapt behaviors over time
- **Respect my time** — ask smart questions, try things before asking
- **Plan bigger work** — write detailed plans that can be handed off to sub-agents

## Credits

- `answer.ts` and `todos.ts` from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
