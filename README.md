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

That's it. Extensions, skills, agents, and prompts update instantly.

### What setup.sh does

1. Creates `settings.json` with the right packages (if it doesn't exist)
2. Installs all git packages via `pi install` (see [Packages](#packages) below)
3. Runs `npm install` for extensions with dependencies (claude-tool)

---

## What's Included

### Agents

Specialized subagents for delegated workflows, powered by `pi-subagents`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Sonnet 4.6 | Implements tasks from todos, commits with polished messages, closes todos |
| **reviewer** | Codex 5.3 | Reviews code for quality and security using the shared review-rubric skill |
| **researcher** | Sonnet 4.6 → Claude Code | Deep research using Claude Code — web research, code analysis, technical exploration |
| **visual-tester** | Sonnet 4.6 | Visual QA — navigates web UIs via Playwriter MCP, spots issues, tests interactions |

### Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **brainstorm** | Planning a new feature — full flow: investigate → clarify → explore → validate → plan → todos → execute |
| **code-simplifier** | Simplifying or cleaning up code |
| **commit** | Making git commits (mandatory for every commit) |
| **frontend-design** | Building web components, pages, or apps |
| **github** | Working with GitHub via `gh` CLI |
| **learn-codebase** | Onboarding to a new project, checking conventions |
| **review-rubric** | Shared review guidelines — used by `/review` and the reviewer agent |
| **session-reader** | Reading and analyzing pi session JSONL files |
| **skill-creator** | Scaffolding new agent skills |
| **tmux** | Driving interactive CLIs via tmux |
| **presentation-creator** | Creating data-driven presentation slides with React, Vite, and Recharts |
| **glimpse** | Showing native macOS UI — dialogs, forms, charts, floating widgets |
| **visual-tester** | Visual testing web UIs with Playwriter MCP |

### Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions into interactive Q&A UI |
| **branch.ts** | Branch management utilities |
| **claude-tool/** | `claude` tool — invoke Claude Code for web research, autonomous tasks. Streams results live |
| **cost.ts** | `/cost` command — API cost summary across sessions and models |
| **execute-command.ts** | `execute_command` tool — lets the agent self-invoke `/answer`, `/reload`, etc. |
| **ghostty.ts** | Ghostty terminal title + progress bar integration |
| **review.ts** | `/review` + `/end-review` — code review for PRs, branches, commits, or uncommitted changes |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management with locking and TUI |
| **watchdog.ts** | Monitors agent behavior |

### AGENTS.md

[`AGENTS.md`](AGENTS.md) defines core principles (proactive mindset, keep it simple, read before edit, verify before done, etc.), agent delegation patterns, skill triggers, and commit strategy.

### Packages

Installed via `pi install` and managed in `settings.json`.

| Package | Description |
|---------|-------------|
| [pi-subagents](https://github.com/HazAT/pi-subagents) | `subagent` tool for delegating tasks to specialized agents |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | AI-generated session names |
| [pi-parallel](https://github.com/HazAT/pi-parallel) | Parallel web search, extract, research, and enrich tools |
| [glimpse](https://github.com/HazAT/glimpse) | Native macOS UI from scripts — dialogs, forms, visualizations, floating widgets |
| [pi-cmux](https://github.com/sasha-computer/pi-cmux) | cmux integration — context-aware notifications, sidebar status, browser/workspace tools |

### MCP Servers

[`mcp.json`](mcp.json) configures MCP servers:
- **playwriter** — Browser automation for visual testing

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/answer` | `Ctrl+.` | Extract questions into interactive Q&A |
| `/review` | — | Code review (PR, branch, commit, uncommitted) |
| `/end-review` | — | Complete review and return to original session |
| `/todos` | — | Visual todo manager |
| `/cost` | — | API cost summary |

## Tools

| Tool | Source | Description |
|------|--------|-------------|
| `claude` | claude-tool extension | Invoke Claude Code for web research, code analysis, or any autonomous task |
| `execute_command` | execute-command extension | Self-invoke slash commands or send follow-up prompts |
| `todo` | todos extension | Manage file-based todos (list, create, update, claim, close) |
| `subagent` | pi-subagents | Delegate tasks to agents with chains and parallel execution |
| `subagent_status` | pi-subagents | Check async subagent run status |
| `parallel_search` | pi-parallel | Search the public web with AI-powered search |
| `parallel_extract` | pi-parallel | Extract clean markdown from external websites |
| `parallel_research` | pi-parallel | Deep async research synthesizing across many sources |
| `parallel_enrich` | pi-parallel | Batch-enrich structured data with web-sourced information |
| `glimpse` | glimpse | Show native macOS UI — dialogs, forms, visualizations, widgets |
| `cmux_browser` | pi-cmux | Open URLs, take snapshots, click, fill forms inside cmux |
| `cmux_workspace` | pi-cmux | List/create workspaces, split panes, send text to terminals |
| `cmux_notify` | pi-cmux | Send targeted notifications inside cmux |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer.ts`, `todos.ts`, `review.ts`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`

Patterns inspired by [obra/superpowers](https://github.com/obra/superpowers): `brainstorm` skill, core principles
