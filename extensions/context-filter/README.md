# Context Filter

A pi extension that gives you `.gitignore`-style control over which context files, agent instructions, and skills are included in the system prompt.

## Why?

Pi automatically loads `AGENTS.md` / `CLAUDE.md` files from your home directory, ancestor directories, and the current project. It also loads all discovered skills into the prompt. Sometimes you want to override this — exclude a parent project's instructions when working in a subfolder, skip the global `AGENTS.md`, or inject your own context files.

## Setup

Place a `.context` file in your project's `.pi/` directory:

```
your-project/
├── .pi/
│   └── .context
└── ...
```

Pi reads this file on session start. Use `/reload` to pick up changes without restarting.

## Syntax

```bash
# Lines starting with # are comments
# Blank lines are ignored

# Exclude files with ! (supports globs)
!~/.pi/agent/AGENTS.md

# Include files with + (resolved relative to project root)
+.pi/MYCONTEXT.md
```

### Exclusions (`!`)

Exclude `AGENTS.md` / `CLAUDE.md` sections and skill entries from the system prompt. Patterns are matched against absolute file paths using [picomatch](https://github.com/micromatch/picomatch) glob syntax.

```bash
# Exact path (~ expands to home directory)
!~/.pi/agent/AGENTS.md

# All AGENTS.md files from any ancestor directory
!**/AGENTS.md

# A specific skill
!**/skills/brainstorm/SKILL.md

# All skills under a directory
!**/skills/**
```

### Inclusions (`+`)

Add arbitrary files to the system prompt. Paths are resolved relative to the project root. Files are read fresh on every prompt, so edits are picked up immediately.

```bash
# Add a custom context file
+.pi/MYCONTEXT.md

# Absolute paths work too
+~/shared-context/team-guidelines.md
```

## Examples

**Use only the local project's AGENTS.md, ignore everything else:**

```bash
# .pi/.context
!~/.pi/agent/AGENTS.md
!../**/AGENTS.md
```

**Swap in your own context file:**

```bash
# .pi/.context
!**/AGENTS.md
+.pi/my-instructions.md
```

**Keep everything but drop a noisy skill:**

```bash
# .pi/.context
!**/skills/brainstorm/SKILL.md
```

## How It Works

The extension hooks into pi's `before_agent_start` event to modify the system prompt before each LLM call:

1. **Exclusions** — Strips `## /path/to/AGENTS.md` sections from the Project Context block and removes matching `<skill>` entries from the available skills list.
2. **Inclusions** — Reads the specified files and appends them to the Project Context section.

On startup, a widget above the editor shows all active rules (auto-hides after 15 seconds), and a persistent footer status displays the filter summary (e.g., `[.context] ✕ 5 excluded`).

Note: Pi's own `[Context]` and `[Skills]` startup display still shows all discovered files — that's pi's internal display and can't be changed by extensions. The widget and footer make it clear what's actually being filtered from the prompt.

## Limitations

- **Extensions cannot be filtered.** Extension loading happens before any extension code runs, so this tool can only control what appears in the *system prompt* (AGENTS.md content and skill listings).
- **Format-dependent.** The extension parses the system prompt structure that pi generates. If pi significantly changes its prompt format in the future, the filtering may need updating.
