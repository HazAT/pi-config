# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — skills, extensions, agents, and soul that shape how pi works for me.

## Setup

Choose your setup method based on how you want to use this config.

### Option A: Package Installation (Recommended)

Install as a pi package — best for using the config without modifying it.

```bash
# 1. Install pi-subagents (required for agent delegation)
pi install npm:pi-subagents

# 2. Install this config
pi install git:github.com/HazAT/pi-config

# 3. Symlink agents and skills for subagent discovery
#    (pi-subagents looks in ~/.pi/agent/ for these)

# Find where pi installed the package
PI_CONFIG_DIR="$HOME/.pi/agent/git/github.com/HazAT/pi-config"

# Symlink agents
mkdir -p ~/.pi/agent/agents
for agent in "$PI_CONFIG_DIR"/agents/*.md; do
  ln -sf "$agent" ~/.pi/agent/agents/
done

# Symlink skills
mkdir -p ~/.pi/agent/skills
for skill in "$PI_CONFIG_DIR"/skills/*/; do
  ln -sf "$skill" ~/.pi/agent/skills/
done

echo "Setup complete! Restart pi to load the new config."
```

### Option B: Local Development

Clone the repo locally — best for customizing or contributing.

```bash
# 1. Clone the repo
git clone https://github.com/HazAT/pi-config.git ~/Projects/pi-config
cd ~/Projects/pi-config

# 2. Install pi-subagents
pi install npm:pi-subagents

# 3. Tell pi to use this local directory as a package
#    Add to ~/.pi/agent/settings.json under "packages":
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
# Check agents are linked
ls -la ~/.pi/agent/agents/
# Should show: scout.md, worker.md, reviewer.md

# Check skills are linked  
ls ~/.pi/agent/skills/
# Should show: brainstorm, commit, github, tmux

# Test the chain
pi
> Ask pi to run: subagent({ agent: "scout", task: "Say hello" })
```

## Update

```bash
pi update
```

After updating, re-run the symlink commands if new agents or skills were added.

## Soul

The **SOUL.md** defines who Pi is — identity, values, and approach. It's prepended to the system prompt on every turn via the `soul.ts` extension.

### Core Principles (always-on)

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

### Main Agent Identity

Pi-specific behaviors (not inherited by subagents):
- Self-invoke commands (`/answer`, `/reload`) via the `execute_command` tool
- Delegate to subagents for substantial work
- Skill triggers for explicit workflows

See [SOUL.md](SOUL.md) for the full definition.

## Agents

Specialized subagents for delegated workflows. Requires `pi-subagents` package.

| Agent | Model | Purpose |
|-------|-------|---------|
| **scout** | Haiku | Fast codebase reconnaissance — gathers context without changes |
| **worker** | Opus | Implements tasks from todos, writes code, runs tests |
| **reviewer** | Opus | Reviews code for quality, security, and correctness |

### Workflow Patterns

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

### Agent Outputs

Each agent writes to a specific file in the chain directory:

| Agent | Output File | Contents |
|-------|------------|----------|
| `scout` | `context.md` | Codebase overview, patterns, gotchas |
| `worker` | `progress.md` | Completed todos, issues encountered |
| `reviewer` | `review.md` | Findings with priority levels, verdict |

See [Setup](#setup) for installation and symlink instructions.

## Skills

Skills provide specialized instructions for specific tasks. They're loaded on-demand when the context matches.

| Skill | When to Load | What it does |
|-------|--------------|--------------|
| **brainstorm** | Planning a new feature or significant change | Structured brainstorming: investigate → clarify → explore → validate design → write plan → create todos → execute with subagents |
| **commit** | Making git commits | Create conventional commits with proper format |
| **github** | Working with GitHub | Interact with GitHub using `gh` CLI — issues, PRs, CI runs |
| **tmux** | Need interactive CLI control | Remote control tmux sessions for interactive CLIs (python, gdb, etc.) |

### Skill Triggers (from SOUL.md)

The soul references additional skills that may be added in the future:

| When... | Load skill... |
|---------|---------------|
| User wants to brainstorm / build something significant | `brainstorm` |
| Making git commits | `commit` |
| Working with GitHub | `github` |
| Need to control tmux sessions | `tmux` |

## Extensions

Extensions add functionality to pi — commands, tools, shortcuts, and hooks.

| Extension | What it provides |
|-----------|------------------|
| **soul.ts** | Loads SOUL.md and prepends it to the system prompt on every turn |
| **execute-command.ts** | `execute_command` tool — self-invoke slash commands like `/answer`, `/reload` |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions from last message into interactive Q&A UI |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management in `.pi/todos/` with locking, assignments, and TUI |
| **review.ts** | `/review` command — code review for PRs, branches, commits, or uncommitted changes |

### Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/answer` | `Ctrl+.` | Extract questions from last assistant message into interactive Q&A |
| `/todos` | — | Visual todo manager for file-based todos in `.pi/todos/` |
| `/review` | — | Interactive code review (PR, branch, commit, uncommitted changes) |
| `/end-review` | — | Complete review session and return to original position |

### Tools

| Tool | Description |
|------|-------------|
| `execute_command` | Self-invoke slash commands or send follow-up prompts |
| `todo` | Manage file-based todos (list, get, create, update, append, delete, claim, release) |

## Setup Notes

### tmux skill

Requires tmux (Linux/macOS). Works out of the box.

The skill uses a dedicated socket directory for agent sessions:
- Socket dir: `${TMPDIR:-/tmp}/claude-tmux-sockets`
- Default socket: `claude.sock`

Helper scripts in `skills/tmux/scripts/`:
- `wait-for-text.sh` — Poll a pane for a regex pattern with timeout
- `find-sessions.sh` — List tmux sessions with metadata

## Credits

Skills and extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff):
- `answer.ts`, `todos.ts`, `review.ts` (extensions)
- `commit`, `github`, `tmux` (skills)

Skill patterns and principles inspired by [obra/superpowers](https://github.com/obra/superpowers):
- `brainstorm` skill
- Core principles in SOUL.md (systematic debugging, verification before completion, etc.)
