---
name: session-reader
description: Efficiently read and analyze pi agent session JSONL files. Use when asked to "read a session", "review a session", "analyze a session", "what happened in this session", "load session", "parse session", "session history", or given a .jsonl session file path.
---

# Read Pi Sessions

Parse pi session JSONL files into readable, structured output. Sessions live in `~/.pi/agent/sessions/<project>/` as `.jsonl` files.

## Step 1: Identify the Session File

Resolve the session file path. Sessions are stored at:
```
~/.pi/agent/sessions/--<path-with-dashes>--/<timestamp>_<uuid>.jsonl
```

If the user provides a partial path or project name, find the file:
```bash
ls -t ~/.pi/agent/sessions/*<project>*/*.jsonl | head -5
```

## Step 2: Start with an Overview

Always start with the overview to understand the session before diving deeper:

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py <path> --mode overview
```

This shows: session metadata (model, project, cost), turn count, and a summary of every turn with timestamps and tool calls used.

## Step 3: Read Specific Content

Based on what's needed, use the appropriate mode:

| Goal | Command |
|------|---------|
| See user/assistant conversation only | `--mode conversation` |
| See everything including tool I/O | `--mode full` |
| See what tools were called and results | `--mode tools` |
| Analyze token usage and costs | `--mode costs` |
| See subagent delegations with task/status/cost/paths | `--mode subagents` |

### Controlling Output Size

For large sessions, use `--offset` and `--limit` to page through user turns:

```bash
# Skip first 3 user turns, show next 5
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py <path> --mode conversation --offset 3 --limit 5
```

Control content truncation with `--max-content`:

```bash
# Show full tool outputs (no truncation)
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py <path> --mode full --max-content 0

# Shorter previews (500 chars per block)
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py <path> --mode full --max-content 500
```

## Step 3b: Drill into Subagent Sessions

When a session contains subagent calls, the `--mode subagents` output shows paths to each subagent's own JSONL session. Read those with the same script:

```bash
# Persistent artifact copy (always available)
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py ~/.pi/agent/sessions/<project>/subagent-artifacts/<hash>_worker.jsonl --mode overview

# Temp session file (may be cleaned up)
uv run ${CLAUDE_SKILL_ROOT}/scripts/read_session.py $TMPDIR/pi-subagent-session-<id>/run-0/<timestamp>.jsonl --mode overview
```

Subagent sessions use the exact same JSONL format. The `overview` and `full` modes all handle subagent data — they show inline summaries with agent, model, cost, duration, and status for each subagent run.

## Step 4: Report Findings

When summarizing a session for the user, include:

1. **What was the goal** — first user message intent
2. **What happened** — key steps taken, tools used, decisions made
3. **Outcome** — did it succeed? What was the final state?
4. **Notable issues** — errors, retries, workarounds, wasted effort
5. **Cost** — total spend and token usage

## Session Format Reference

If you need to understand the raw JSONL format (for custom parsing), read:
`${CLAUDE_SKILL_ROOT}/references/session-format.md`

The critical thing to know: message content is nested at `line.message.content`, NOT `line.content`. Content is always an array of typed objects (`text`, `toolCall`, `thinking`). Tool results are separate message entries with `role: "toolResult"`.
