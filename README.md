# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills, extensions, agents, and soul that shape how pi works for me.

## Quick Start

To replicate my exact setup:

```bash
# 1. Install required packages
pi install npm:pi-subagents
pi install npm:pi-interactive-shell
pi install npm:@juanibiapina/pi-gob
pi install npm:pi-notify

# 2. Install this config
pi install git:github.com/HazAT/pi-config

# 3. Symlink agents and skills for subagent discovery
PI_CONFIG_DIR="$HOME/.pi/agent/git/github.com/HazAT/pi-config"
mkdir -p ~/.pi/agent/agents ~/.pi/agent/skills
for agent in "$PI_CONFIG_DIR"/agents/*.md; do ln -sf "$agent" ~/.pi/agent/agents/; done
for skill in "$PI_CONFIG_DIR"/skills/*/; do ln -sf "$skill" ~/.pi/agent/skills/; done
mkdir -p ~/.pi/agent/extensions
ln -sf "$PI_CONFIG_DIR/extensions/context-filter" ~/.pi/agent/extensions/context-filter

# 4. Restart pi
```

## Required Packages

This config depends on several pi packages that provide core functionality:

| Package | What it provides |
|---------|------------------|
| **npm:pi-subagents** | `subagent` tool for delegating tasks to specialized agents (scout, worker, reviewer) with chains and parallel execution |
| **npm:pi-interactive-shell** | `interactive_shell` tool for running AI coding agents (pi, claude, gemini) in TUI overlays with hands-free monitoring |
| **npm:@juanibiapina/pi-gob** | Integration with [gob](https://github.com/juanibiapina/gob) for background process management — status widget and job control |
| **npm:pi-notify** | Desktop notifications when the agent finishes — supports Ghostty, iTerm2, WezTerm, Kitty, and Windows Terminal via OSC 777/99 |

### Install All Packages

```bash
pi install npm:pi-subagents
pi install npm:pi-interactive-shell
pi install npm:@juanibiapina/pi-gob
pi install npm:pi-notify
pi install git:github.com/HazAT/pi-config
```

### gob Setup

The `@juanibiapina/pi-gob` package requires [gob](https://github.com/juanibiapina/gob) to be installed:

```bash
# macOS
brew install juanibiapina/tap/gob

# Or build from source
cargo install --git https://github.com/juanibiapina/gob
```

## Setup Options

### Option A: Package Installation (Recommended)

Install as a pi package — best for using the config without modifying it.

```bash
# 1. Install all required packages (see above)

# 2. Install this config
pi install git:github.com/HazAT/pi-config

# 3. Symlink agents and skills for subagent discovery
#    (pi-subagents looks in ~/.pi/agent/ for these)

PI_CONFIG_DIR="$HOME/.pi/agent/git/github.com/HazAT/pi-config"

mkdir -p ~/.pi/agent/agents
for agent in "$PI_CONFIG_DIR"/agents/*.md; do
  ln -sf "$agent" ~/.pi/agent/agents/
done

mkdir -p ~/.pi/agent/skills
for skill in "$PI_CONFIG_DIR"/skills/*/; do
  ln -sf "$skill" ~/.pi/agent/skills/
done

# Symlink extensions that need global availability
mkdir -p ~/.pi/agent/extensions
ln -sf "$PI_CONFIG_DIR/extensions/context-filter" ~/.pi/agent/extensions/context-filter

echo "Setup complete! Restart pi to load the new config."
```

### Option B: Local Development

Clone the repo locally — best for customizing or contributing.

```bash
# 1. Clone the repo
git clone https://github.com/HazAT/pi-config.git ~/Projects/pi-config
cd ~/Projects/pi-config

# 2. Install required packages
pi install npm:pi-subagents
pi install npm:pi-interactive-shell
pi install npm:@juanibiapina/pi-gob
pi install npm:pi-notify

# 3. Add to ~/.pi/agent/settings.json under "packages":
#    "/Users/YOUR_USERNAME/Projects/pi-config"

# 4. Symlink agents for subagent discovery
mkdir -p ~/.pi/agent/agents
for agent in agents/*.md; do
  ln -sf "$(pwd)/$agent" ~/.pi/agent/agents/
done

# 5. Symlink skills for subagent discovery
mkdir -p ~/.pi/agent/skills
for skill in skills/*/; do
  ln -sf "$(pwd)/$skill" ~/.pi/agent/skills/
done

# 6. Symlink extensions that need global availability
mkdir -p ~/.pi/agent/extensions
ln -sf "$(pwd)/extensions/context-filter" ~/.pi/agent/extensions/context-filter

echo "Setup complete! Restart pi to load the new config."
```

### Why Symlinks?

Pi loads extensions and skills from packages automatically, but **pi-subagents** runs agents as separate processes that look for resources in standard locations:

| Resource | Subagent lookup path |
|----------|---------------------|
| Agents | `~/.pi/agent/agents/{name}.md` |
| Skills | `~/.pi/agent/skills/{name}/SKILL.md` |

The symlinks bridge the gap between where pi-config lives and where subagents look.

### Verify Setup

```bash
# Check packages are installed
pi list

# Check agents are linked
ls -la ~/.pi/agent/agents/
# Should show: scout.md, worker.md, reviewer.md

# Check skills are linked  
ls ~/.pi/agent/skills/
# Should show: brainstorm, commit, github

# Test subagent delegation
pi
> Ask pi to run: subagent({ agent: "scout", task: "Say hello" })
```

## Update

```bash
pi update
```

After updating, re-run the symlink commands if new agents or skills were added.

---

## What's Included

### Soul

The **SOUL.md** defines who Pi is — identity, values, and approach. It's prepended to the system prompt on every turn via the `soul.ts` extension.

#### Core Principles (always-on)

These behaviors apply automatically — no skill loading needed:

| Principle | What it means |
|-----------|---------------|
| **Proactive Mindset** | Explore codebases before asking obvious questions |
| **Professional Objectivity** | Be direct and honest, no excessive praise |
| **Keep It Simple** | YAGNI — minimum complexity for the task |
| **Read Before You Edit** | Never modify code you haven't read |
| **Try Before Asking** | Check if tools exist instead of asking |
| **Test As You Build** | Verify work as you go, not at the end |
| **Verify Before Done** | Run verification commands before claiming success |
| **Investigate Before Fixing** | Find root cause, no shotgun debugging |
| **Process Management** | Use `gob` for background processes (servers, builds) |
| **Thoughtful Questions** | Only ask what requires human judgment |

#### Main Agent Identity

Pi-specific behaviors (not inherited by subagents):
- Self-invoke commands (`/answer`, `/reload`) via the `execute_command` tool
- Delegate to subagents for substantial work
- Skill triggers for explicit workflows

See [SOUL.md](SOUL.md) for the full definition.

### Agents

Specialized subagents for delegated workflows. Provided by this config, powered by `pi-subagents`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without changes |
| **worker** | Opus | Implements tasks from todos, writes code, runs tests |
| **reviewer** | Opus | Reviews code for quality, security, and correctness |

#### Workflow Patterns

**Planning happens in the main session** (interactive, with user feedback) — not delegated to subagents. Use the `brainstorm` skill for structured planning.

**Standard implementation flow:**
```typescript
{ chain: [
  { agent: "scout", task: "Gather context for [feature]. Key files: [list relevant files]" },
  { agent: "worker", task: "Implement TODO-xxxx. Plan: .pi/plans/YYYY-MM-DD-feature.md" },
  { agent: "worker", task: "Implement TODO-yyyy. Plan: .pi/plans/YYYY-MM-DD-feature.md" },
  { agent: "reviewer", task: "Review implementation. Plan: .pi/plans/YYYY-MM-DD-feature.md" }
]}
```

**Quick fix (no plan needed):**
```typescript
{ chain: [
  { agent: "worker", task: "Fix [specific issue]" },
  { agent: "reviewer" }
]}
```

#### Agent Outputs

Each agent writes to a specific file in the chain directory:

| Agent | Output File | Contents |
|-------|------------|----------|
| `scout` | `context.md` | Codebase overview, patterns, gotchas |
| `worker` | `progress.md` | Completed todos, issues encountered |
| `reviewer` | `review.md` | Findings with priority levels, verdict |

### Skills

Skills provide specialized instructions for specific tasks. They're loaded on-demand when the context matches.

| Skill | When to Load | What it does |
|-------|--------------|--------------|
| **brainstorm** | Planning a new feature or significant change | Structured brainstorming: investigate → clarify → explore → validate design → write plan → create todos → execute with subagents |
| **commit** | Making git commits | Create conventional commits with proper format |
| **github** | Working with GitHub | Interact with GitHub using `gh` CLI — issues, PRs, CI runs |

### Extensions (from this config)

Extensions add functionality to pi — commands, tools, shortcuts, and hooks.

| Extension | What it provides |
|-----------|------------------|
| **soul.ts** | Loads SOUL.md and prepends it to the system prompt on every turn |
| **execute-command.ts** | `execute_command` tool — self-invoke slash commands like `/answer`, `/reload` |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management in `.pi/todos/` with locking, assignments, and TUI |
| **review.ts** | `/review` command — code review for PRs, branches, commits, or uncommitted changes |
| **context-filter** | `.gitignore`-style control over which context files and skills appear in the system prompt |

#### Context Filter

The **context-filter** extension reads a `.pi/.context` file to control which `AGENTS.md` / `CLAUDE.md` files and skills are included in the system prompt. It also supports adding custom context files.

```bash
# .pi/.context

# Exclude the global AGENTS.md
!~/.pi/agent/AGENTS.md

# Exclude all ancestor AGENTS.md files
!**/AGENTS.md

# Exclude a specific skill
!**/skills/brainstorm/SKILL.md

# Include a custom context file
+.pi/MYCONTEXT.md
```

- `!pattern` — Exclude matching files (supports [picomatch](https://github.com/micromatch/picomatch) globs)
- `+path` — Include an arbitrary file into the system prompt (resolved relative to project root)
- `#` — Comments
- Blank lines are ignored

The `.context` file is read from `.pi/.context` in the current working directory only (no ancestor walking). Use `/reload` to pick up changes.

See the [context-filter README](extensions/context-filter/README.md) for more details and examples.

#### Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/answer` | `Ctrl+.` | Extract questions from last assistant message into interactive Q&A |
| `/todos` | — | Visual todo manager for file-based todos in `.pi/todos/` |
| `/review` | — | Interactive code review (PR, branch, commit, uncommitted changes) |
| `/end-review` | — | Complete review session and return to original position |

#### Tools (from this config)

| Tool | Description |
|------|-------------|
| `execute_command` | Self-invoke slash commands or send follow-up prompts |
| `todo` | Manage file-based todos (list, get, create, update, append, delete, claim, release) |

### Tools (from required packages)

These tools come from the required npm packages:

| Tool | Package | Description |
|------|---------|-------------|
| `subagent` | pi-subagents | Delegate tasks to specialized agents with chains and parallel execution |
| `subagent_status` | pi-subagents | Check status of async subagent runs |
| `interactive_shell` | pi-interactive-shell | Run AI coding agents in TUI overlays with hands-free monitoring |

---

## Setup Notes

### Recommended Settings

My `~/.pi/agent/settings.json` uses these settings:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-opus-4-5",
  "hideThinkingBlock": true
}
```

## Credits

Skills and extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff):
- `answer.ts`, `todos.ts`, `review.ts` (extensions)
- `commit`, `github` (skills)

Skill patterns and principles inspired by [obra/superpowers](https://github.com/obra/superpowers):
- `brainstorm` skill
- Core principles in SOUL.md (systematic debugging, verification before completion, etc.)

Required packages:
- [pi-subagents](https://github.com/nicobailon/pi-subagents) by Nico Bailon
- [pi-interactive-shell](https://github.com/badlogic/pi-interactive-shell) 
- [@juanibiapina/pi-gob](https://github.com/juanibiapina/pi-gob) by Juan Ibiapina
- [pi-notify](https://github.com/ferologics/pi-notify) by ferologics
