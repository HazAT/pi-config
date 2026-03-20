# Pi Config

Personal [pi](https://github.com/badlogic/pi) configuration for a **local-first** workflow with a deliberate Codex/OpenAI premium path when the task is important enough to justify hosted spend.

## Setup

Windows is the primary workflow. Clone this repo to `%USERPROFILE%\.pi\agent` so pi auto-discovers the agents, skills, extensions, and project instructions.

### Fresh machine (Windows / PowerShell)

```powershell
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
New-Item -ItemType Directory -Force "$HOME/.pi" | Out-Null
git clone git@github.com:HazAT/pi-config "$HOME/.pi/agent"

# 3. Run setup (creates local-first settings and installs packages)
Set-Location "$HOME/.pi/agent"
.\setup.ps1

# 4. Add your API keys to $HOME/.pi/agent/auth.json when a package needs them

# 5. Restart pi
```

### Updating (Windows / PowerShell)

```powershell
Set-Location "$HOME/.pi/agent"
git pull
.\setup.ps1
```

### macOS / Linux

```sh
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent
cd ~/.pi/agent
./setup.sh
```

---

## Architecture

This config uses **subagents**: visible pi sessions spawned in cmux terminals. Each subagent is a full pi session with its own identity, tools, and skills. The user can watch agents work in real time and interact when needed.

### Key Concepts

- **Subagents** — visible cmux terminals running pi. Autonomous agents self-terminate via `subagent_done`. Interactive agents wait for the user.
- **Agent definitions** (`agents/*.md`) — one source of truth for role, tools, and operating policy.
- **Plan workflow** — `/plan` spawns an interactive planner subagent, then orchestrates workers and reviewers.
- **Iterate pattern** — `/iterate` forks the session into a subagent for quick fixes without polluting the main context.

---

## Agents

Specialized roles with baked-in identity, workflow, and review rubrics.

| Agent | Default execution | Purpose |
|-------|-------------------|---------|
| **planner** | Local by default | Interactive brainstorming — clarify, explore, validate design, write plan, create todos |
| **scout** | Local by default | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Local by default | Implements tasks from todos, runs checks, commits polished changes |
| **reviewer** | Local by default | Reviews code for quality, security, and correctness |
| **researcher** | Local by default | Web research with parallel tools plus local repo analysis |
| **visual-tester** | Local by default | Visual QA via Chrome CDP |
| **autoresearch** | Local by default | Autonomous experiment loop — runs, measures, and optimizes iteratively |

## Operating Modes

Choose one operating mode before starting substantial work.

| Mode | Hosted model policy | Intended use |
|------|---------------------|--------------|
| **Cheap** | No hosted models. Everything stays local. | Routine exploration, drafts, low-risk edits, iteration on disposable work. |
| **Balanced** | Keep `scout`, `planner`, `researcher`, `autoresearch`, and `visual-tester` local. Allow hosted Codex/OpenAI runs only for `worker` or `reviewer` when the task is important enough to justify spend. | Default team mode. |
| **Premium** | `scout` stays local unless a huge messy codebase needs premium synthesis. Hosted runs are allowed for `planner`, `worker`, and `reviewer`, and for `researcher` only when external synthesis speed matters more than quota. `autoresearch` stays local unless you explicitly approve hosted experimentation. | Deadline-driven or high-risk work where speed and extra review quality matter more than quota. |

## Routing Policy: Local First, Codex Deliberately

- **Default config is local-first.** The checked-in `settings.json` uses `lmstudio` as the default provider and does not pin a hosted model.
- **Codex is a premium path, not the default.** Escalate only when the task is narrow, high-value, or genuinely benefits from stronger hosted reasoning.
- **Hosted spend should be explicit.** If a task can be answered with local context, local tools, or routine repo analysis, keep it local.
- **Research stays local unless the value is obvious.** Use hosted research/synthesis only when external sources or faster premium synthesis materially change the answer.

### Agent-by-agent guidance

- **`scout`** — local unless the repo is huge and the bottleneck is summarizing messy context fast.
- **`planner`** — local for ordinary planning. Premium only for unusually ambiguous or high-stakes design work.
- **`worker`** — local for most implementation. Premium for narrow, important tasks where speed and stronger code generation are worth paying for.
- **`reviewer`** — local for intermediate checks. Premium for final review on changes where missed defects would be expensive.
- **`researcher`** — local plus parallel tools first. Hosted only when premium cross-source synthesis is worth the spend.
- **`autoresearch`** — local by default. Hosted experimentation should be a conscious opt-in.
- **`visual-tester`** — local. The bottleneck is browser interaction, not hosted model quality.

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
| **cmux/** | cmux integration — notifications, sidebar, workspace tools |
| **cost/** | `/cost` command — API cost summary |
| **execute-command/** | `execute_command` tool — lets the agent self-invoke slash commands |
| **todos/** | `/todos` command + `todo` tool — file-based todo management |
| **watchdog/** | Monitors agent behavior |

## Commands

| Command | Description |
|---------|-------------|
| `/plan <description>` | Start a planning session — spawns planner subagent, then orchestrates execution |
| `/subagent <agent> <task>` | Spawn a subagent |
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
| [glimpse](https://github.com/HazAT/glimpse) | Native UI — dialogs, forms, visualizations |
| [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) | Chrome DevTools Protocol CLI for visual testing |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer`, `todos`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`
