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

| Agent | Model | Purpose |
|-------|-------|---------|
| **planner** | Opus 4.6 | Interactive brainstorming — clarify, explore, validate design, write plan, create todos |
| **scout** | Haiku 4.5 | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Sonnet 4.6 | Implements tasks from todos, commits with polished messages |
| **reviewer** | Opus 4.6 | Reviews code for quality, security, correctness (review rubric baked in) |
| **researcher** | Sonnet 4.6 | Deep research using parallel.ai tools + Claude Code for code analysis |
| **visual-tester** | Sonnet 4.6 | Visual QA — navigates web UIs via Chrome CDP, spots issues, produces reports |
| **autoresearch** | Opus 4.6 | Autonomous experiment loop — runs, measures, and optimizes iteratively |

## Decision Guide: Local vs Codex Spend

Use the default agent role first, then decide whether the job is cheap enough to keep local or important enough to spend Codex usage. The goal is simple: keep routine exploration and low-risk iteration local, and spend Codex when the extra speed, synthesis, or review quality is worth the quota.

### Agent-by-agent guidance

- **`scout`** — run **locally by default**. It is mostly reconnaissance, codebase scanning, and context gathering, so the work is usually cheap and parallel-friendly without spending Codex usage. Spend Codex only if you specifically need higher-quality synthesis from a large, messy codebase.
- **`planner`** — run **locally for ordinary planning**. Use Codex only when the design is unusually complex, the requirements are genuinely ambiguous, or the planning step needs stronger structured reasoning than your normal local flow.
- **`worker`** — use **Codex for focused implementation bursts** where speed and code quality justify the quota cost. Keep it **local for broad exploratory work, large low-risk edits, or tasks where the main cost is mechanical churn rather than hard implementation judgment**.
- **`reviewer`** — use **Codex for final review on important changes** where catching subtle correctness, quality, or security issues matters. Keep it **local for cheap intermediate checks** while work is still moving quickly.
- **`researcher`** — use it in **hosted mode only when external web research or synthesis is actually needed**. If the answer is already in the repo or can be verified locally, do not spend for hosted research.
- **`autoresearch`** — keep it **local only** unless you are explicitly choosing to spend on hosted experimentation. Its loop can consume a lot of usage over time, so hosted runs should be an intentional opt-in rather than the default.

### Spend Codex when…

- the task is narrow, high-value, and benefits from stronger implementation or review quality
- you need a polished answer quickly and the speed matters more than the quota cost
- the design problem is unusually complex, ambiguous, or full of tradeoffs
- the final review is important enough that an extra pass could prevent an expensive mistake
- external research or cross-source synthesis is required and local context is not enough

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


### Skill Classification

All checked-in skills are now classified for a local-first + Codex-fallback workflow:

| Skill | Classification | Notes |
|---|---|---|
| `commit` | keep | Local git workflow; added lightweight escalation guidance for unusually large diffs. |
| `github` | keep | `gh`-driven and model-agnostic. |
| `code-simplifier` | convert | Rewritten to remove Claude-specific assumptions and prefer local-first simplification. |
| `learn-codebase` | convert | Kept the cross-tool scan, but rewrote it around generic instruction files and local scanning. |
| `cmux` | keep | Purely local terminal orchestration. |
| `session-reader` | convert | Still useful locally, but now uses repo-relative paths and generic model examples. |
| `iterate-pr` | convert | Kept the CI/review loop and added local-first vs Codex escalation guidance. |
| `skill-creator` | convert | Rewritten around portable Agent Skills guidance instead of Claude-only extensions. |
| `add-mcp-server` | keep | Local configuration workflow; already model-agnostic. |
| `frontend-design` | convert | Removed Claude-branded creative framing while keeping the design guidance. |
| `presentation-creator` | convert | Kept the Sentry-specific workflow but removed Claude-specific path assumptions. |

No skill in `skills/` is worth keeping in a Claude-only form. Where a skill still references runtime-specific features, treat them as optional extensions instead of the default path.

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
