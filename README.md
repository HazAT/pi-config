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

Use this when the task is routine, exploratory, or mostly mechanical.

- **Hosted models:** none.
- **Local agents:** every built-in agent stays on the repo default local provider/model.
- **Recommended for:** scouting, ordinary planning, broad edits, cheap review passes, local repo analysis, and iterative experimentation.

### Balanced mode — local first

Use this when most work is still cheap locally, but selected implementation and review steps are worth spending Codex.

- **Hosted models allowed:** `worker` and `reviewer`, but only on important tasks.
- **Local agents:** `scout`, `planner`, `researcher`, `visual-tester`, and `autoresearch` remain local.
- **Recommended for:** local scouting and planning, Codex for narrow/high-value implementation bursts, and Codex for final review when the change matters enough to justify it.

### Premium mode — speed over quota

Use this when turnaround time matters more than hosted-model budget.

- **Hosted models allowed:** `planner`, `worker`, and `reviewer`; `researcher` can also use hosted web research or synthesis when local analysis is not enough.
- **Local agents:** `scout`, `visual-tester`, and `autoresearch` still default local because their work is usually cheaper locally even in premium mode.
- **Recommended for:** ambiguous design work, urgent implementation, and important final review loops where extra synthesis or speed is worth the spend.

### Worth spending Codex when…

- the task is narrow, high-value, and benefits from stronger implementation or review quality
- you need a polished answer quickly and speed matters more than quota
- the design problem is unusually complex, ambiguous, or full of tradeoffs
- the final review is important enough that an extra pass could prevent an expensive mistake
- external research or cross-source synthesis is required and the local/parallel tool path is not enough

### Stay local when…

- you are gathering context, scouting files, or doing ordinary planning
- the work is broad, exploratory, or mostly mechanical editing
- you want cheap intermediate checks before a final pass
- the answer already exists in the repo, local tools, or easily verifiable local state
- hosted spend has not been explicitly justified by complexity, importance, or research needs

### Skill routing

The shipped skills follow the same rule:

- **Keep** skills that are model-agnostic and useful locally.
- **Convert** skills that benefit from lightweight routing guidance so they stay local by default and escalate to Codex only for clearly high-value work.
- **Remove** or rewrite Claude-specific assumptions instead of leaving dead-brand instructions in place.

## Skills

Loaded on-demand when the context matches.

### Skill policy

| Skill | Classification | Policy |
|------|----------------|--------|
| `add-mcp-server` | Keep | Local setup workflow; use hosted models only if the server being configured is itself a hosted dependency. |
| `cmux` | Keep | Terminal orchestration is local-only. |
| `commit` | Keep | Commit authoring stays local. |
| `frontend-design` | Convert | Build locally first; spend Codex only when the UI work is high-value and needs faster synthesis. |
| `github` | Keep | Use local CLI/API access first; escalate only when cross-check synthesis is the real value. |
| `iterate-pr` | Convert | Keep the fix/verify loop local, escalate only for high-value implementation or review synthesis. |
| `learn-codebase` | Convert | Stay model-agnostic, local-first, and summarize external convention files without assuming Claude-only flows. |
| `presentation-creator` | Convert | Generate locally first; spend Codex only for urgent or unusually synthesis-heavy decks. |
| `session-reader` | Keep | Session parsing is local inspection work. |
| `skill-creator` | Convert | Author model-agnostic skills and mention hosted escalation only when it meaningfully improves the workflow. |
| `code-simplifier` | Convert | Simplify locally first, escalate only for unusually tangled changes. |

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
