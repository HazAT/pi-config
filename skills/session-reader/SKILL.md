---
name: session-reader
description: Efficiently read and analyze pi agent session JSONL files. Use when asked to "read a session", "review a session", "analyze a session", "what happened in this session", "load session", "parse session", "session history", or given a .jsonl session file path.
---

# Read Pi Sessions

Parse pi session JSONL files into readable output. Start locally with the bundled script; escalate to a stronger hosted model only when you need deeper synthesis across many long sessions.

## Routing Guidance

| Prefer local when... | Escalate when... |
|---|---|
| You need an overview of one session. | You need synthesis across many long sessions or subagents. |
| You are tracing tools, errors, or costs from structured logs. | You need higher-order pattern extraction from extensive session history. |
| The bundled parser already surfaces what happened. | The user wants a polished cross-session narrative after local extraction. |

Resolve script and reference paths relative to this skill directory.

## Step 1: Identify the Session File

Resolve the session file path. Sessions are typically stored at:

```text
~/.pi/agent/sessions/--<path-with-dashes>--/<timestamp>_<uuid>.jsonl
```

If the user provides only a project name or partial path, find recent candidates first:

```bash
find ~/.pi/agent/sessions -path '*<project>*/*.jsonl' -print | sort | tail -5
```

## Step 2: Start with an Overview

Always begin with the overview mode:

```bash
uv run ./skills/session-reader/scripts/read_session.py <path> --mode overview
```

This shows session metadata, turn count, timestamps, and a summary of each turn with tool usage.

## Step 3: Read the Right Level of Detail

| Goal | Command |
|---|---|
| Conversation only | `uv run ./skills/session-reader/scripts/read_session.py <path> --mode conversation` |
| Full transcript including tool I/O | `uv run ./skills/session-reader/scripts/read_session.py <path> --mode full` |
| Tool calls and results | `uv run ./skills/session-reader/scripts/read_session.py <path> --mode tools` |
| Token usage and cost | `uv run ./skills/session-reader/scripts/read_session.py <path> --mode costs` |
| Subagent runs and linked artifacts | `uv run ./skills/session-reader/scripts/read_session.py <path> --mode subagents` |

### Control output size

```bash
uv run ./skills/session-reader/scripts/read_session.py <path> --mode conversation --offset 3 --limit 5
uv run ./skills/session-reader/scripts/read_session.py <path> --mode full --max-content 0
uv run ./skills/session-reader/scripts/read_session.py <path> --mode full --max-content 500
```

## Step 4: Drill into Subagent Sessions

When the parent session contains subagent calls, inspect the referenced subagent JSONL files with the same script:

```bash
uv run ./skills/session-reader/scripts/read_session.py ~/.pi/agent/sessions/<project>/subagent-artifacts/<hash>_worker.jsonl --mode overview
uv run ./skills/session-reader/scripts/read_session.py "$TMPDIR/pi-subagent-session-<id>/run-0/<timestamp>.jsonl" --mode overview
```

Subagent sessions use the same format, so `overview`, `full`, and the other modes work unchanged.

## Step 5: Report Findings

When summarizing a session, include:
1. the original goal
2. the major steps and tools used
3. the outcome or stopping point
4. notable failures, retries, or wasted effort
5. cost and token usage when relevant

## Session Format Reference

If you need the raw format details, read:
`skills/session-reader/references/session-format.md`

Key detail: message content lives at `line.message.content`, not `line.content`. Content blocks are typed arrays such as `text`, `toolCall`, and `thinking`. Tool outputs appear as separate `role: "toolResult"` entries.
