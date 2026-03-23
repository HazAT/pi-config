# Pi Config

Windows-first [pi](https://github.com/badlogic/pi) config for llama-server by default, with optional LM Studio and optional native Codex login through Pi when you want ChatGPT Plus-backed online help.

## Setup

Clone this repo directly to `"$HOME\.pi\agent"` so Pi auto-discovers the config.

### Fresh machine

```powershell
# 1. Install pi and your preferred local backend

# 2. Clone this repo as your Pi agent config
git clone <your-fork-url> "$HOME\.pi\agent"

# 3. Run setup
Set-Location "$HOME\.pi\agent"
.\setup.ps1
```

The installer is interactive. It can create a timestamped backup of your current Pi config under `"$HOME\.pi_backup"` before it installs packages, lets you choose `Llama Server` or `LM Studio`, and runs the matching local-backend check.

### Updating

```powershell
Set-Location "$HOME\.pi\agent"
git pull
```

## Local Backends

This repo assumes exactly one local chat model is loaded at a time under the shared alias `pi-local`.

### Llama Server

Run your OpenAI-compatible llama server on `http://127.0.0.1:1234/v1`.

```powershell
Invoke-RestMethod http://127.0.0.1:1234/v1/models
pi --list-models
```

### LM Studio

```powershell
lms ls
lms server start
lms load <your-chosen-local-model> --identifier pi-local -c 32768
lms ps
pi --list-models
```

Example loads:

```powershell
lms load huihui-qwen3-coder-30b-a3b-instruct-abliterated-i1 --identifier pi-local -c 32768
lms load qwen3.5-9b-claude-code --identifier pi-local -c 32768
```

The repo does not require `pi-fast`, `pi-main`, or `pi-heavy`. If you want extra aliases for your own experiments, you can create them, but the shipped config only depends on `pi-local` and supports both `Llama Server/pi-local` and `LM Studio/pi-local`.

## Codex OAuth

This repo does not use `openai-oauth` and does not require an OpenAI API key for Codex access.

Use Pi's native login flow instead:

```text
/login
```

Choose `ChatGPT Plus/Pro (Codex)`, then verify what Pi can see:

```powershell
pi --list-models codex
```

Local agents remain the default. Use the Codex-specific agents only when you explicitly want online help for planning, review, or research.

## Architecture

This config uses subagents, visible cmux terminals, local-first model defaults, and a small set of repo-local extensions.

### Key Concepts

- `agents/*.md` defines the role, default model, and workflow for each specialist.
- `models.json` defines the shipped local providers for the shared `pi-local` alias.
- `settings.json` defaults to `Llama Server` on `pi-local`.
- `/login` is the optional online path for native Codex OAuth.

## Agents

| Agent | Default model | Purpose |
|-------|---------------|---------|
| **planner** | `Llama Server/pi-local` | Interactive brainstorming, planning, and todo creation |
| **scout** | `Llama Server/pi-local` | Fast reconnaissance and codebase mapping |
| **worker** | `Llama Server/pi-local` | Implements scoped tasks and verifies results |
| **python-worker** | `Llama Server/pi-local` | Python specialist for scripts, packages, tooling, APIs, and tests |
| **dotnet-worker** | `Llama Server/pi-local` | .NET specialist for C# apps, libraries, ASP.NET Core, and test workflows |
| **docker-worker** | `Llama Server/pi-local` | Docker specialist for Dockerfiles, Compose stacks, and local service orchestration |
| **env-doctor** | `Llama Server/pi-local` | Diagnoses broken local setup across Pi, llama-server, LM Studio, MCP, Docker, and tooling |
| **backup-config** | `Llama Server/pi-local` | Creates timestamped backups of your Pi config under `~/.pi_backup` |
| **reviewer** | `Llama Server/pi-local` | Reviews code for correctness, risk, and quality |
| **researcher** | `Llama Server/pi-local` | Uses installed research tools plus local code analysis |
| **visual-tester** | `Llama Server/pi-local` | Visual QA through Chrome CDP |
| **autoresearch** | `Llama Server/pi-local` | Autonomous experiment loop |

Codex offload agents:

| Agent | Default model | Purpose |
|-------|---------------|---------|
| **planner-codex** | `openai-codex/gpt-5.4` | Cloud planning when you want to spend Codex quota |
| **reviewer-codex** | `openai-codex/gpt-5.4` | Cloud review for deeper second-pass analysis |
| **researcher-codex** | `openai-codex/gpt-5.4` | Cloud research and synthesis when local context is not enough |

## Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer/** | `/answer` command plus `Ctrl+.` for interactive Q&A |
| **cmux/** | cmux integration, notifications, and sidebar status |
| **cost/** | `/cost` command for session cost summaries |
| **execute-command/** | lets the agent self-invoke slash commands |
| **todos/** | `/todos` command plus `todo` tool |
| **watchdog/** | monitors agent behavior |

The helper extensions are local-first too:

- `answer` prefers the active local session model, then `Llama Server/pi-local`, then `LM Studio/pi-local`, then falls back to the current model.
- `watchdog` tries `Llama Server/pi-local` first, then `LM Studio/pi-local`, then the current session model.

## Packages

Installed through `pi install`, managed in `settings.json`.

| Package | Description |
|---------|-------------|
| [pi-interactive-subagents](https://github.com/HazAT/pi-interactive-subagents) | subagent tools plus `/plan`, `/subagent`, `/iterate` |
| [pi-parallel](https://github.com/HazAT/pi-parallel) | optional web search and research tools |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | AI-generated session names |
| [pi-autoresearch](https://github.com/HazAT/pi-autoresearch) | autonomous experiment loop |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) | Chrome DevTools Protocol CLI for visual testing |

## Which Agent Should I Use?

Use a specialist worker when the dominant task matches its domain. Use the generic `worker` when the task is mixed or no single domain clearly owns it.

| Agent | Use it when | Why | When not to use it |
|-------|-------------|-----|--------------------|
| **worker** | The task is mixed-stack, generic, or not clearly owned by one specialty | Lowest-friction default execution path | When Python, .NET, or Docker clearly dominates the task |
| **python-worker** | The task is mainly Python scripts, packages, APIs, tooling, data work, or pytest-heavy changes | Better environment, dependency, and verification choices for Python work | When Python is incidental to a broader task |
| **dotnet-worker** | The task is mainly C# or .NET and should be verified with `dotnet` | Better solution/project discovery and .NET build-test discipline | When the task is Unity-specific or not primarily .NET |
| **docker-worker** | The task is about Dockerfiles, Compose, local services, ports, images, or container debugging | Thinks in services, images, logs, health checks, and startup order | When the real problem is app logic, not the container layer |
| **env-doctor** | Pi, llama-server, LM Studio, MCP, Docker, or local tooling is broken before feature work can proceed | Isolates machine/setup diagnosis from product implementation | When the task is normal implementation rather than environment diagnosis |
| **scout** | You need quick reconnaissance before making changes | Maps structure, patterns, and gotchas fast | When the task is ready for implementation |
| **planner** | Requirements or design are fuzzy | Turns ambiguity into plans and todos | When scope is already clear and execution can start |
| **reviewer** | Substantial implementation is complete | Gives a focused correctness and risk pass | When no meaningful implementation has happened yet |
| **researcher** | The task needs outside docs or ecosystem research | Uses research tools plus local analysis | When the answer is fully local to the repo |

### Selection Rules

- Use `scout` to map an unfamiliar codebase before implementation.
- Use `planner` when scope or design is still fuzzy.
- Use `python-worker`, `dotnet-worker`, or `docker-worker` when the main task clearly fits that specialty.
- Use `worker` when the task is mixed or generic.
- Use `reviewer` after substantial implementation.
- Use `env-doctor` when local tools or infrastructure are failing.

### Example Prompts

- `python-worker`: `Fix this failing pytest and keep the change minimal.`
- `python-worker`: `Add a CLI option to this Python script and verify it directly.`
- `dotnet-worker`: `Implement this C# change and verify the affected project with dotnet build.`
- `dotnet-worker`: `Fix this failing .NET test and keep the change scoped to the right project.`
- `docker-worker`: `Debug why this compose stack fails locally and verify the affected service comes up.`
- `docker-worker`: `Update this Dockerfile for local development and verify the image still builds.`
- `env-doctor`: `Diagnose why pi-local is not available even though my llama server is running.`
- `env-doctor`: `Figure out why Docker compose fails before the app starts.`
- `backup-config`: `Create a backup of my current Pi config before I change anything.`

For a longer operator guide with workflow examples, see [docs/agent-guide.md](docs/agent-guide.md).

## Notes

- This repo is intentionally Windows-first and local-first.
- The main path is one local model under `pi-local`, with llama-server as the default backend.
- Codex is an explicit secondary path through `planner-codex`, `reviewer-codex`, and `researcher-codex`.
- API-key-based OpenAI usage is still possible in Pi generally, but it is not the primary path for this config.

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer`, `todos`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`

Repo-local skills added in this config: `learn-codebase`, `frontend-design`, `cmux`, `add-mcp-server`, `session-reader`, `iterate-pr`, `presentation-creator`, `dev-environment`, `python-project`, `dotnet-project`
