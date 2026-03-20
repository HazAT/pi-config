---
name: cmux
description: |
  Manage terminal sessions via cmux — spawn workspaces for dev servers,
  test runners, and background tasks. Read output, send commands, and
  orchestrate multi-terminal workflows.
---

# cmux Terminal Management

Use this skill when you need to run processes in separate terminals you can
observe and control — dev servers, test watchers, build processes, or any
long-running task. This is a local workflow; do not spend Codex just to supervise terminal panes.

**Prerequisite:** You must be running inside cmux (check for `CMUX_SOCKET_PATH`
in the environment). If it's not set, these commands won't work.

**Default approach:** Prefer creating **surfaces (tabs)** in the current
workspace over spawning new workspaces. Tabs keep everything grouped together
and are less disruptive. Only use `new-workspace` when you need full isolation
(e.g., a completely separate project).

---

## Environment Variables

cmux auto-sets these in every shell it spawns:

| Variable | Purpose |
|----------|---------|
| `CMUX_WORKSPACE_ID` | UUID of the current workspace |
| `CMUX_SURFACE_ID` | UUID of the current surface/panel |
| `CMUX_SOCKET_PATH` | Unix socket path (usually `/tmp/cmux.sock`) |

Commands run inside a cmux shell automatically target the right workspace
without needing `--workspace`.

---

## Core Commands

### Create a new tab (surface) in the current workspace

```bash
cmux new-surface --type terminal
# Returns: OK surface:<n> pane:<n> workspace:<n>
```

This is the **preferred way** to spawn a new shell. It creates a tab next to
the current terminal in the same workspace.

### Create a new split pane

```bash
cmux new-split <left|right|up|down>
cmux new-pane --direction <left|right|up|down> [--type terminal]
```

### Spawn a new workspace (for full isolation)

```bash
cmux new-workspace [--cwd <path>] [--command "<text>"]
# Returns: OK workspace:<n>
```

### Send commands

```bash
cmux send --surface <ref> '<command>\n'
```

The `\n` sends Enter. Without it, text is typed but not executed.

### Read terminal output

```bash
cmux read-screen --surface <ref> [--lines <n>] [--scrollback]
```

- Default: visible screen only
- `--scrollback`: include scrollback buffer
- `--lines <n>`: limit to last N lines (implies scrollback)

### Close a surface / workspace

```bash
cmux close-surface --surface <ref>
cmux close-workspace --workspace <ref>
```

### List workspaces and surfaces

```bash
cmux list-workspaces --json
cmux list-panels                   # List surfaces in current workspace
cmux tree --json                   # Full layout with all details
```

### Notifications

```bash
cmux notify --title "<text>" --body "<text>"
```

### Send special keys

```bash
cmux send-key --surface <ref> ctrl+c    # Interrupt
cmux send-key --surface <ref> ctrl+d    # EOF
cmux send-key --surface <ref> escape    # Escape
```

---

## Patterns

### Pattern 1: Start a dev server in a new tab

```bash
# Create a tab and capture its surface ref
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5

# Send the command
cmux send --surface $SURFACE 'cd /path/to/project && npm run dev\n'

# Poll until ready
for i in $(seq 1 30); do
  OUTPUT=$(cmux read-screen --surface $SURFACE --lines 20)
  if echo "$OUTPUT" | grep -qi "ready\|listening\|started\|compiled"; then
    echo "Server is ready"
    break
  fi
  sleep 1
done

# ... do work against the server ...

# Clean up when done
cmux close-surface --surface $SURFACE
```

### Pattern 2: Run tests in a tab and read results

```bash
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5
cmux send --surface $SURFACE 'cd /path/to/project && npm test\n'
sleep 10
cmux read-screen --surface $SURFACE --scrollback --lines 200
cmux close-surface --surface $SURFACE
```

### Pattern 3: Interactive session — send multiple commands

```bash
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5

cmux send --surface $SURFACE 'git status\n'
sleep 1
cmux read-screen --surface $SURFACE --lines 30

cmux send --surface $SURFACE 'git log --oneline -5\n'
sleep 1
cmux read-screen --surface $SURFACE --lines 30

cmux close-surface --surface $SURFACE
```

### Pattern 4: Monitor multiple processes

```bash
S_API=$(cmux new-surface --type terminal | awk '{print $2}')
S_WEB=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5

cmux send --surface $S_API 'cd ./api && npm run dev\n'
cmux send --surface $S_WEB 'cd ./web && npm run dev\n'

# Check on any of them
sleep 3
cmux read-screen --surface $S_API --lines 20
cmux read-screen --surface $S_WEB --lines 20

# Clean up
cmux close-surface --surface $S_API
cmux close-surface --surface $S_WEB
```

### Pattern 5: Split pane for side-by-side view

```bash
cmux new-split right   # Terminal split to the right
cmux new-split down    # Terminal split below
```

---

## Important Notes

- **Prefer tabs over workspaces** — use `new-surface` to keep things grouped
- **Always clean up** surfaces when done — don't leave orphaned terminals
- **Use `--lines`** with read-screen to avoid dumping huge scrollback buffers
- **Surface refs are ephemeral** — `surface:16` may refer to a different
  surface next time. Always capture the ref from command output
- **Poll, don't guess** — there's no "wait for output" command, so poll
  `read-screen` in a loop when waiting for specific output
- **`\n` is literal** — the cmux CLI interprets `\n` as a newline character
  in `send` commands, which presses Enter
