# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills, extensions, and soul that shape how pi works for me.

## Install

```bash
pi install git:github.com/HazAT/pi-config
```

## Update

```bash
pi update
```

## Soul

The **SOUL.md** defines who Pi is — identity, values, and approach. It's prepended to the system prompt on every turn.

Pi is a **proactive, highly skilled software engineer** who:
- Explores before asking
- Thinks before building
- Plans before coding
- Learns continuously

See [SOUL.md](SOUL.md) for the full definition.

## Skills

| Skill | What it does |
|-------|--------------|
| **self-improve** | Learn new behaviors from natural language — "Hey pi, remember that..." |
| **auto-memory** | Automatically remember facts about environment, projects, and gotchas |
| **think-before-building** | Explore the codebase and brainstorm before jumping to implementation |
| **plan-before-coding** | For larger projects: check location, brainstorm, write detailed plans, create todos |
| **thoughtful-questions** | Ask one meaningful question at a time, not a list |
| **try-before-asking** | Try running commands instead of asking if tools are installed |
| **reload-after-skill** | After creating a skill, prefill `/reload` for instant activation |
| **test-as-you-build** | Verify work as you go with lightweight tests |
| **commit** | Create conventional commits with proper format |
| **github** | Interact with GitHub using `gh` CLI |
| **web-browser** | Remote control Chrome via CDP for web interactions |
| **tmux** | Remote control tmux sessions for interactive CLIs |

## Extensions

| Extension | What it does |
|-----------|--------------|
| **soul.ts** | Loads SOUL.md and prepends it to the system prompt |
| **memory.ts** | Persistent memory system — global (`~/.pi/memory.md`) and per-project (`.pi/memory.md`) |
| **prefill-editor.ts** | Tool to prefill the input editor (powers the reload-after-skill flow) |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **todos.ts** | `/todos` command — file-based todo management in `.pi/todos/` with locking, assignments, and TUI |

## Setup Notes

### web-browser skill

Requires Chrome/Chromium and Node.js. Install dependencies:
```bash
cd skills/web-browser/scripts && npm install
```

### tmux skill

Requires tmux (Linux/macOS). Works out of the box.

## Credits

Skills and extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff):
- `answer.ts`, `todos.ts` (extensions)
- `commit`, `github`, `web-browser`, `tmux` (skills)
