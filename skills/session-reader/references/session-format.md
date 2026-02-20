# Pi Session JSONL Format

## Contents
- File location and naming
- Line types
- Message structure
- Content types
- Subagent sessions
- Common pitfalls

## File Location and Naming

Sessions are stored in `~/.pi/agent/sessions/` organized by project:

```
~/.pi/agent/sessions/
├── --Users-haza-Projects-sentry--/
│   ├── 2026-02-20T20-17-15-095Z_1a6f6bc4-....jsonl
│   ├── subagent-artifacts/
│   │   ├── 5f316403_worker_input.md
│   │   ├── 5f316403_worker_output.md
│   │   └── 5f316403_worker.jsonl
```

- Directory names encode the project path with `--` delimiters and `-` replacing `/`
- Filenames: `<ISO-timestamp>_<UUID>.jsonl`
- Each line is a standalone JSON object

## Line Types

Every line has a `type` field:

| Type | Purpose | Key Fields |
|------|---------|------------|
| `session` | First line, session metadata | `version`, `id`, `timestamp`, `cwd` |
| `model_change` | Model switch event | `provider`, `modelId` |
| `thinking_level_change` | Thinking mode change | `thinkingLevel` |
| `message` | Conversation content | `message: {role, content, ...}` |

## Message Structure

**Critical:** The actual message is nested inside a `message` field:

```json
{
  "type": "message",
  "id": "abc123",
  "parentId": "def456",
  "timestamp": "2026-02-20T20:49:39.589Z",
  "message": {
    "role": "user",
    "content": [{"type": "text", "text": "Hello"}],
    "timestamp": 1771620579506
  }
}
```

### Message Roles

| Role | Description |
|------|-------------|
| `user` | User messages |
| `assistant` | Agent responses (text, tool calls, thinking) |
| `toolResult` | Tool execution results |

### Assistant Messages with Metadata

```json
{
  "role": "assistant",
  "content": [...],
  "api": "anthropic-messages",
  "provider": "anthropic",
  "model": "claude-opus-4-6",
  "usage": {
    "input": 3, "output": 209,
    "cacheRead": 0, "cacheWrite": 11576, "totalTokens": 11788,
    "cost": {"input": 0.000015, "output": 0.005225, "total": 0.077}
  },
  "stopReason": "toolUse"
}
```

### toolResult Messages

```json
{
  "role": "toolResult",
  "toolCallId": "toolu_abc123",
  "toolName": "bash",
  "content": [{"type": "text", "text": "output here"}],
  "isError": false,
  "timestamp": 1771620584031
}
```

## Content Types

The `content` field is an array of typed objects:

| Type | Found In | Fields |
|------|----------|--------|
| `text` | user, assistant, toolResult | `text` |
| `toolCall` | assistant | `id`, `name`, `arguments` |
| `thinking` | assistant | `thinking`, `thinkingSignature` |

## Subagent Sessions

When the main agent delegates to subagents (worker, reviewer, scout), the subagent `toolResult` contains rich metadata in a `details` field.

### Subagent toolResult Structure

```json
{
  "role": "toolResult",
  "toolCallId": "toolu_xxx",
  "toolName": "subagent",
  "content": [{"type": "text", "text": "Done. Added the Workflow link..."}],
  "details": {
    "mode": "single",
    "results": [...],
    "artifacts": {...}
  }
}
```

### details.mode

| Mode | Description |
|------|-------------|
| `single` | One agent, one task |
| `parallel` | Multiple agents running concurrently |
| `chain` | Sequential pipeline, each step feeds the next |

### details.results[]

Each result object contains:

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Agent name (worker, reviewer, scout) |
| `task` | string | The task prompt given to the agent |
| `exitCode` | number | 0 = success, non-zero = failure |
| `messages` | array | Full conversation (same format as session messages, inline) |
| `model` | string | Model used (e.g., "claude-sonnet-4-6:minimal") |
| `usage` | object | `{input, output, cacheRead, cacheWrite, cost, turns}` |
| `progressSummary` | object | `{toolCount, tokens, durationMs}` |
| `skills` | array | Skill names loaded (e.g., ["commit"]) |
| `sessionFile` | string | Path to full JSONL in temp dir |
| `artifactPaths` | object | Paths to input/output/jsonl/metadata files |
| `progress` | object | Status tracking with task details |

### details.artifacts

```json
{
  "dir": "~/.pi/agent/sessions/<project>/subagent-artifacts",
  "files": [
    {
      "inputPath": ".../<hash>_worker_input.md",
      "outputPath": ".../<hash>_worker_output.md",
      "jsonlPath": ".../<hash>_worker.jsonl",
      "metadataPath": ".../<hash>_worker_metadata.json"
    }
  ]
}
```

### Subagent Session File Locations

Three ways to access subagent session data:

1. **Inline messages** — `details.results[].messages` (embedded in parent, always available)
2. **Temp session file** — `details.results[].sessionFile` at `$TMPDIR/pi-subagent-session-<random>/run-<N>/` (may be cleaned up)
3. **Persistent artifacts** — `details.artifacts.files[]` in `~/.pi/agent/sessions/<project>/subagent-artifacts/` (persistent)

To read a subagent's full session, use its `sessionFile` or `artifactPaths.jsonlPath` with the same `read_session.py` script.

## Common Pitfalls

1. **Nested message:** Content is at `line.message.content`, NOT `line.content`
2. **Content is an array:** Even single messages use `[{type: "text", text: "..."}]`
3. **Tool results are separate entries:** Not inside the assistant message
4. **Large sessions:** Tool results often contain huge outputs
5. **String content:** Some older content fields may be plain strings
6. **Subagent details:** The `details` field on subagent toolResults is NOT in the `content` array — it's a sibling of `content` on the message object
7. **Subagent temp files:** `sessionFile` paths are in `$TMPDIR` and may be cleaned up; use `artifactPaths.jsonlPath` for persistent copies
