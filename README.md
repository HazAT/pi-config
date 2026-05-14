# Pi Config

Personal global [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) configuration. Clone it to `~/.pi/agent/` to get the same agents, skills, prompt templates, local extensions, model defaults, and package configuration.

This config is now **Solo-native** and intentionally small: orchestration goes through Solo subagents, Solo scratchpads, and Solo todos; only the local extensions that are still useful remain.

## Setup

```bash
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent
cd ~/.pi/agent && ./setup.sh
```

Add credentials to `~/.pi/agent/auth.json` and restart pi. If you use the optional OpenRouter model in `models.json`, also provide `OPENROUTER_API_KEY` in your environment.

`setup.sh` expects this repo to live at `~/.pi/agent/` and installs the configured packages.

## Defaults

| Setting | Value |
|---|---|
| Default provider | `openai-codex` |
| Default model | `gpt-5.5` |
| Default thinking level | `xhigh` |
| Enabled models | `anthropic/claude-opus-4-7`, `openai-codex/gpt-5.5` |
| Installed packages | `git:github.com/pasky/chrome-cdp-skill`, `git:github.com/HazAT/pi-parallel` |

Custom provider definitions live in `models.json`:

- `lmstudio` — local Gemma 4 26B A4B via LM Studio.
- `openrouter` — Poolside Laguna M.1 free model via OpenRouter.

## Architecture

- **Solo subagents** run focused roles and save artifacts to Solo scratchpads.
- **Solo todos** hold executable work items for workers.
- **Scratchpads** are the artifact channel for scout context, plans, worker results, reviews, and research.
- **Prompt templates** provide slash-command workflows such as `/plan`.
- **Local extensions** provide `/answer`, `/cost`, and the `execute_command` tool.

The old local `cmux` and file-based `todos` extensions are gone; orchestration now uses Solo directly.

## Agents

| Agent | Model | Purpose |
|---|---|---|
| `planner` | `anthropic/claude-opus-4-6` | Interactive Solo planning; clarifies intent, designs the approach, writes a plan scratchpad, and creates Solo todos |
| `scout` | `anthropic/claude-haiku-4-5` | Fast read-only codebase reconnaissance |
| `worker` | `anthropic/claude-sonnet-4-6` | Implements one Solo todo, verifies it, commits with the `commit` skill, saves a result scratchpad, and closes the todo |
| `reviewer` | `openai-codex/gpt-5.5` | Reviews changes for quality, security, and correctness |
| `researcher` | `anthropic/claude-sonnet-4-6` | Uses web tools and local code reading to produce sourced research |
| `visual-tester` | `anthropic/claude-sonnet-4-6` | Uses Chrome CDP for visual QA and scratchpad reports |
| `autoresearch` | `anthropic/claude-opus-4-6` | Runs autonomous experiment batches |

## Skills

| Skill | When to Load |
|---|---|
| `plan` | Running the Solo-native planning workflow |
| `write-todos` | Writing worker-ready Solo todos from a plan |
| `commit` | Making git commits; mandatory for every commit |
| `code-simplifier` | Simplifying or cleaning up code |
| `frontend-design` | Building web components, pages, or apps |
| `github` | Working with GitHub via `gh` CLI |
| `iterate-pr` | Iterating on a PR until CI passes |
| `learn-codebase` | Onboarding to a project and checking conventions |
| `session-reader` | Reading and analyzing pi session JSONL files |
| `skill-creator` | Creating agent skills |
| `add-mcp-server` | Adding MCP server configurations |
| `chrome-cdp` | Inspecting local Chrome tabs when explicitly approved |

Removed skills: `cmux`, `presentation-creator`, and `self-improve`.

## Prompt Templates and Local Extensions

| Path | Provides |
|---|---|
| `prompts/plan.md` | `/plan <description>` Solo planning workflow |
| `extensions/answer/` | `/answer` and `ctrl+.` interactive Q&A extraction from the last assistant message |
| `extensions/cost/` | `/cost [days]` API cost summary |
| `extensions/execute-command/` | `execute_command` tool for triggering `/answer`, queuing slash commands, or sending a steer message |

## Packages

Packages are managed in `settings.json`.

| Package | Purpose |
|---|---|
| `git:github.com/pasky/chrome-cdp-skill` | Chrome DevTools Protocol CLI and skill for visual testing |
| `git:github.com/HazAT/pi-parallel` | Web search, fetch, deep research, and batch enrichment tools |

## Update

```bash
cd ~/.pi/agent
git pull
./setup.sh
```
