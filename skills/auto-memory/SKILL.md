---
name: auto-memory
description: |
  Applies throughout every session. When you discover facts about the environment, project,
  or encounter gotchas worth remembering, use the `remember` tool to save them.
  Distinguishes between MEMORY (facts) and SKILLS (behaviors).
---

# Auto Memory

Automatically remember important facts as you work.

## When to Remember

Use the `remember` tool when you discover:

### Global Memory (scope: "global")
Facts about the user's machine and preferences:
- **Environment**: OS, shell type, terminal capabilities
- **Tools**: What's installed, versions, quirks
- **Preferences**: Coding style, preferred approaches
- **Gotchas**: System-specific issues to watch for

Examples:
- "Windows 11 with PowerShell, not bash"
- "Has ffmpeg 6.0 installed"
- "Prefers functional style over OOP"
- "Node version manager is nvm, not fnm"

### Project Memory (scope: "project")
Facts about the current codebase:
- **Project**: Stack, structure, conventions
- **Environment**: Required tools, versions, setup
- **Gotchas**: Project-specific quirks

Examples:
- "Monorepo using pnpm workspaces"
- "Tests use Vitest, not Jest"
- "CI requires Node 20+"
- "Build script needs GITHUB_TOKEN env var"

## Memory vs Skill — The Distinction

**STOP and reflect** before saving. Ask yourself:

| Memory (use `remember`) | Skill (create SKILL.md) |
|-------------------------|-------------------------|
| A **fact** about the environment | A **behavior** I should adopt |
| Exists independently of me | Changes how I act |
| "X is true here" | "When X, do Y" |
| Passive knowledge | Active instruction |

### Examples

| Situation | Memory or Skill? |
|-----------|------------------|
| "This is Windows, use PowerShell" | **Memory** — fact about environment |
| "Ask one question at a time" | **Skill** — changes my behavior |
| "Project uses pnpm" | **Memory** — fact about project |
| "Always run tests before committing" | **Skill** — instruction to follow |
| "User prefers TypeScript" | **Memory** — preference/fact |
| "Think through problems before implementing" | **Skill** — behavioral change |

## When NOT to Remember

Don't clutter memory with:
- Obvious things (this is a JavaScript file)
- Temporary state (we're fixing bug #123)
- Things already in project config (package.json has the dependencies)
- One-off corrections (unless they reveal a pattern)

## How to Remember

```
remember(
  scope: "global" | "project",
  category: "Environment" | "Tools" | "Preferences" | "Gotchas" | "Project",
  entry: "Concise but clear description of the fact"
)
```

Be concise. Future-you will thank present-you.
