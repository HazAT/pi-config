# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

### 1. Install packages

```bash
pi install npm:pi-subagents
pi install npm:pi-mcp-adapter
pi install npm:pi-smart-sessions
```

### 2. Install this config

**As a package (recommended):**
```bash
pi install git:github.com/HazAT/pi-config
```

**Or for local development:**
```bash
git clone https://github.com/HazAT/pi-config.git ~/Projects/pi-config
# Add "/Users/YOUR_USERNAME/Projects/pi-config" to packages in ~/.pi/agent/settings.json
```

### 3. Symlink agents for subagent discovery

pi-subagents looks for agents in `~/.pi/agent/agents/`. Symlink them:

```bash
PI_CONFIG_DIR="$HOME/.pi/agent/git/github.com/HazAT/pi-config"
# Or if using local dev: PI_CONFIG_DIR="$HOME/Projects/pi-config"

mkdir -p ~/.pi/agent/agents
for agent in "$PI_CONFIG_DIR"/agents/*.md; do
  ln -sf "$agent" ~/.pi/agent/agents/
done
```

### 4. Restart pi

## Packages

| Package | Purpose |
|---------|---------|
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | `subagent` tool for delegating tasks to scout, worker, reviewer agents |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | Auto-names sessions with AI-generated summaries from skill invocations |

---

## What's Included

### Agents

Specialized subagents for delegated workflows, powered by `pi-subagents`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Sonnet 4.6 | Implements tasks from todos, commits with polished messages, closes todos |
| **reviewer** | Codex 5.3 | Reviews code for quality and security using the shared review-rubric skill |
| **visual-tester** | Sonnet 4.6 | Visual QA — navigates web UIs via Playwriter MCP, spots issues, tests interactions |

The brainstorm skill always runs **scout first → workers → reviewer** so workers start with a strong context baseline instead of exploring from scratch.

### Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **brainstorm** | Planning a new feature — full flow: investigate → clarify → explore → validate → plan → todos → execute |
| **code-simplifier** | Simplifying or cleaning up code |
| **commit** | Making git commits (mandatory for every commit) |
| **frontend-design** | Building web components, pages, or apps |
| **github** | Working with GitHub via `gh` CLI |
| **review-rubric** | Shared review guidelines — used by both the `/review` extension and the reviewer agent |
| **skill-creator** | Scaffolding new agent skills following the Agent Skills spec |
| **tmux** | Running background processes, servers, debuggers |
| **visual-tester** | Visual testing web UIs with Playwriter MCP |

### Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **context-filter/** | `.pi/.context` file for controlling which files and skills appear in the system prompt |
| **cost.ts** | `/cost` command — API cost summary across sessions and models |
| **execute-command.ts** | `execute_command` tool — lets the agent self-invoke `/answer`, `/reload`, etc. |
| **ghostty.ts** | Ghostty terminal title + progress bar integration |
| **review.ts** | `/review` + `/end-review` — code review for PRs, branches, commits, or uncommitted changes |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management with locking and TUI |

### AGENTS.md

[`agent/AGENTS.md`](agent/AGENTS.md) defines core principles (proactive mindset, keep it simple, read before edit, verify before done, etc.), agent delegation patterns, skill triggers, and commit strategy. Symlinked to `~/.pi/agent/AGENTS.md`.

### MCP Servers

[`agent/mcp.json`](agent/mcp.json) configures MCP servers:
- **playwriter** — Browser automation for visual testing
- **spark** — Local dev server

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
| `execute_command` | this config | Self-invoke slash commands or send follow-up prompts |
| `todo` | this config | Manage file-based todos (list, create, update, claim, close) |
| `subagent` | pi-subagents | Delegate tasks to agents with chains and parallel execution |
| `subagent_status` | pi-subagents | Check async subagent run status |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer.ts`, `todos.ts`, `review.ts`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`

Patterns inspired by [obra/superpowers](https://github.com/obra/superpowers): `brainstorm` skill, core principles
