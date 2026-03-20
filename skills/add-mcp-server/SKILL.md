---
name: add-mcp-server
description: Add an MCP server to pi. Use when asked to "add mcp server", "configure mcp", "add mcp", "new mcp server", "setup mcp", "connect mcp server", or "register mcp server". Handles both global and project-local configurations.
---

# Add an MCP Server

Add an MCP server configuration to `pi-mcp-adapter`. Determine scope and server type, write the config, and verify the connection. Keep this local unless the MCP server itself is a hosted dependency the project genuinely needs.

## Step 1: Determine Scope

Ask the user if not obvious from context:

| Scope | Config File | When to Use |
|-------|-------------|-------------|
| **Global** | `~/.pi/agent/mcp.json` | Server used across all projects |
| **Project** | `.pi/mcp.json` (project root) | Server specific to one project |

Project-local configs override global ones. Both files use the same format.

## Step 2: Determine Server Type

MCP servers connect via **stdio** (local process) or **HTTP** (remote URL).

**Stdio server** — runs a local command:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name@latest"],
      "env": { "KEY": "value" }
    }
  }
}
```

**HTTP server** — connects to a URL:
```json
{
  "mcpServers": {
    "server-name": {
      "url": "http://localhost:8080/mcp",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

## Step 3: Gather Configuration

Collect only what's needed. All fields except `command`/`url` are optional.

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Executable to run (stdio) |
| `args` | string[] | Command arguments (stdio) |
| `env` | object | Environment variables (stdio) |
| `cwd` | string | Working directory (stdio) |
| `url` | string | Server URL (HTTP) |
| `headers` | object | HTTP headers (HTTP) |
| `auth` | `"oauth"` or `"bearer"` | Auth method (HTTP) |
| `bearerToken` | string | Static bearer token |
| `bearerTokenEnv` | string | Env var name for bearer token |
| `lifecycle` | `"lazy"` / `"eager"` / `"keep-alive"` | Connection strategy (default: `lazy`) |
| `idleTimeout` | number | Minutes before idle disconnect |
| `debug` | boolean | Show server stderr |

Lifecycle modes:
- **lazy** (default) — connects on first tool call, disconnects after idle timeout
- **eager** — connects at session start, no auto-disconnect
- **keep-alive** — connects at start, auto-reconnects if dropped

## Step 4: Write the Config

1. Read the target config file if it exists
2. Merge the new server into the existing `mcpServers` object
3. Write the updated JSON

If the file doesn't exist, create it with the full structure:
```json
{
  "mcpServers": {
    "server-name": { ... }
  }
}
```

Warn if a server with the same name already exists and confirm before overwriting.

## Step 5: Verify

1. Run `/reload` to pick up the new config
2. Use `mcp({ connect: "server-name" })` to test the connection
3. Use `mcp({ server: "server-name" })` to list available tools
4. Report success or troubleshoot connection errors
