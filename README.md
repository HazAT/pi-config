# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent

# 3. Run setup (installs packages + extension deps)
cd ~/.pi/agent && ./setup.sh

# 4. Add your API keys to ~/.pi/agent/auth.json

# 5. Restart pi
```

### Updating

```bash
cd ~/.pi/agent && git pull
```

---

## Architecture

This config uses **subagents** — visible pi sessions spawned in cmux terminals. Each subagent is a full pi session with its own identity, tools, and skills. The user can watch agents work in real-time and interact when needed.

### Key Concepts

- **Subagents** — visible cmux terminals running pi. Autonomous agents self-terminate via `subagent_done`. Interactive agents wait for the user.
- **Agent definitions** (`agents/*.md`) — one source of truth for model, tools, skills, and identity per role.
- **Plan workflow** — `/plan` spawns an interactive planner subagent, then orchestrates workers and reviewers.
- **Iterate pattern** — `/iterate` forks the session into a subagent for quick fixes without polluting the main context.

---

## Agents

Specialized roles with baked-in identity, workflow, and review rubrics.

| Agent | Default execution | Codex escalation | Purpose |
|-------|-------------------|------------------|---------|
| **planner** | Local default model | Premium mode only, or Balanced when the design is unusually ambiguous/high-stakes | Interactive brainstorming — clarify, explore, validate design, write plan, create todos |
| **scout** | Local default model | Only for unusually messy/high-value synthesis work | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Local default model | Balanced/Premium for important implementation bursts where speed matters | Implements tasks from todos, commits with polished messages |
| **reviewer** | Local default model | Balanced/Premium for important final review passes | Reviews code for quality, security, correctness (review rubric baked in) |
| **researcher** | Local default model plus parallel web tools | Premium only when hosted synthesis is explicitly justified | Deep research using parallel.ai tools first, with local repo analysis by default |
| **visual-tester** | Local default model | Rarely needed; keep local unless a hosted run is explicitly worth it | Visual QA — navigates web UIs via Chrome CDP, spots issues, produces reports |
| **autoresearch** | Local default model | Never by default; hosted loops are an explicit opt-in | Autonomous experiment loop — runs, measures, and optimizes iteratively |

## Operating Modes

The repo is configured for a **local-first default** through LM Studio. Treat hosted Codex usage as an explicit routing decision, not the baseline.

### Cheap mode

**Local only.** Every agent stays on the repo default local model.

- Hosted models allowed: none
- Keep `scout`, `planner`, `worker`, `reviewer`, `researcher`, `visual-tester`, and `autoresearch` local
- Best for reconnaissance, broad edits, iterative debugging, and routine planning

### Balanced mode

**Local first.** Only spend Codex on important implementation and review work.

- Hosted models allowed: `worker`, `reviewer`
- Keep `scout`, `planner`, `researcher`, `visual-tester`, and `autoresearch` local unless the user explicitly overrides that choice
- Best for normal day-to-day work where quota matters but a strong implementation/review pass is sometimes worth it

### Premium mode

**Use Codex where speed is worth the spend.**

- Hosted models allowed: `planner`, `worker`, `reviewer`
- Keep `scout`, `visual-tester`, and `autoresearch` local by default because their work is usually cheaper locally
- Let `researcher` use hosted synthesis only when the task genuinely needs external research plus stronger cross-source synthesis
- Best for high-priority work where faster planning, implementation, and final review are worth the quota

## Decision Guide: Local vs Codex Spend

Use the default agent role first, then route with the same policy the `/answer` extractor now follows: **local model first, Codex only when explicitly allowed, otherwise stay on the current model**. That keeps routine work cheap without hiding the premium path when it is genuinely justified.

### Spend Codex when…

- the task is narrow, high-value, and benefits from stronger implementation or review quality
- you need a polished answer quickly and the speed matters more than the quota cost
- the design problem is unusually complex, ambiguous, or full of tradeoffs
- the final review is important enough that an extra pass could prevent an expensive mistake
- external research or cross-source synthesis is required and the local/parallel tool path is not enough

### Stay local when…

- you are still gathering context, scouting files, or doing ordinary planning
- the work is broad, exploratory, or mostly mechanical editing
- you want cheap intermediate checks before the final pass
- the answer already exists in the repo, local tools, or easily verifiable local state
- hosted spend has not been explicitly justified by complexity, importance, or research needs

## Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **commit** | Making git commits (mandatory for every commit) |
| **code-simplifier** | Simplifying or cleaning up code |
| **frontend-design** | Building web components, pages, or apps |
| **github** | Working with GitHub via `gh` CLI |
| **iterate-pr** | Iterating on a PR until CI passes |
| **learn-codebase** | Onboarding to a new project, checking conventions |
| **session-reader** | Reading and analyzing pi session JSONL files |
| **skill-creator** | Scaffolding new agent skills |
| **cmux** | Managing terminal sessions via cmux |
| **presentation-creator** | Creating data-driven presentation slides |
| **add-mcp-server** | Adding MCP server configurations |

## Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer/** | `/answer` command + `Ctrl+.` — extracts questions into interactive Q&A UI |
| **claude-tool/** | `claude` tool — invoke Claude Code for autonomous tasks |
| **cmux/** | cmux integration — notifications, sidebar, workspace tools |
| **cost/** | `/cost` command — API cost summary |
| **execute-command/** | `execute_command` tool — lets the agent self-invoke slash commands |
| **todos/** | `/todos` command + `todo` tool — file-based todo management |
| **watchdog/** | Monitors agent behavior |

## Commands

| Command | Description |
|---------|-------------|
| `/plan <description>` | Start a planning session — spawns planner subagent, then orchestrates execution |
| `/subagent <agent> <task>` | Spawn a subagent (e.g., `/subagent scout analyze the auth module`) |
| `/iterate [task]` | Fork session into interactive subagent for quick fixes |
| `/answer` | Extract questions into interactive Q&A |
| `/todos` | Visual todo manager |
| `/cost` | API cost summary |

## Packages

Installed via `pi install`, managed in `settings.json`.

| Package | Description |
|---------|-------------|
| [pi-interactive-subagents](https://github.com/HazAT/pi-interactive-subagents) | Subagent tools + `/plan`, `/subagent`, `/iterate` commands |
| [pi-parallel](https://github.com/HazAT/pi-parallel) | Parallel web search, extract, research, and enrich tools |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | AI-generated session names |
| [pi-autoresearch](https://github.com/HazAT/pi-autoresearch) | Autonomous experiment loop with dashboard |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [glimpse](https://github.com/HazAT/glimpse) | Native macOS UI — dialogs, forms, visualizations |
| [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) | Chrome DevTools Protocol CLI for visual testing |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer`, `todos`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`
