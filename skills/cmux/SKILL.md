---
name: cmux
description: |
  Manage terminal sessions via cmux — spawn workspaces for dev servers,
  test runners, and background tasks. Read output, send commands, and
  orchestrate multi-terminal workflows.
---

# cmux Terminal Management

Use cmux to run observable long-lived processes in separate terminals. This is a local-only workflow; do not spend hosted model time on terminal orchestration unless the surrounding task itself needs stronger reasoning.

**Prerequisite:** Confirm `CMUX_SOCKET_PATH` is set before using these commands.

**Default approach:** Prefer creating surfaces (tabs) in the current workspace instead of spawning new workspaces. Use `new-workspace` only when you need isolation.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CMUX_WORKSPACE_ID` | UUID of the current workspace |
| `CMUX_SURFACE_ID` | UUID of the current surface/panel |
| `CMUX_SOCKET_PATH` | Unix socket path |

## Core Commands

### Create a new tab in the current workspace

```bash
cmux new-surface --type terminal
```

### Create a split pane

```bash
cmux new-split <left|right|up|down>
cmux new-pane --direction <left|right|up|down> [--type terminal]
```

### Spawn a new workspace

```bash
cmux new-workspace [--cwd <path>] [--command "<text>"]
```

### Send commands

```bash
cmux send --surface <ref> '<command>\n'
```

### Read output

```bash
cmux read-screen --surface <ref> [--lines <n>] [--scrollback]
```

### Close a surface or workspace

```bash
cmux close-surface --surface <ref>
cmux close-workspace --workspace <ref>
```

### List workspaces and surfaces

```bash
cmux list-workspaces --json
cmux list-panels
cmux tree --json
```

### Notifications and keys

```bash
cmux notify --title "<text>" --body "<text>"
cmux send-key --surface <ref> ctrl+c
```

## Working Patterns

### Start a dev server in a new tab

```bash
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5
cmux send --surface "$SURFACE" 'cd /path/to/project && npm run dev\n'
for i in $(seq 1 30); do
  OUTPUT=$(cmux read-screen --surface "$SURFACE" --lines 20)
  if echo "$OUTPUT" | grep -qi "ready\|listening\|started\|compiled"; then
    echo "Server is ready"
    break
  fi
  sleep 1
done
```

### Run tests in a tab

```bash
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5
cmux send --surface "$SURFACE" 'cd /path/to/project && npm test\n'
sleep 10
cmux read-screen --surface "$SURFACE" --scrollback --lines 200
```

## Important Notes

- Prefer tabs over workspaces.
- Always clean up surfaces you started.
- Use `--lines` to keep output manageable.
- Capture fresh surface references instead of reusing stale ones.
- Poll for readiness; do not guess.
