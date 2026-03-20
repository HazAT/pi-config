---
name: learn-codebase
description: Discover project conventions and surface security concerns. Use when starting work in a new or unfamiliar project, when asked to "learn the codebase", "check project rules", "what are the conventions", "onboard to this project", or "anything shady in this codebase". Scans agent config files from multiple tools and runs a quick security and code-smell sweep.
---

# Learn Codebase Conventions

Scan the project for instruction files, summarize the conventions that actually matter, and note security issues worth immediate attention. Use local inspection first; escalate to a stronger hosted model only if the repository is unusually large or the conventions conflict in subtle ways.

## Routing Guidance

| Prefer local when... | Escalate when... |
|---|---|
| You are onboarding to a normal-sized repo. | The repo is large enough that summarizing conventions needs stronger synthesis. |
| You mainly need file discovery and concise summaries. | The project contains many overlapping rule systems and conflicts that need arbitration. |
| The sweep is a straightforward local scan. | You need a second-pass architectural summary across many packages. |

## Step 1: Scan for Convention Files

Search the project root for instruction files and rule directories from common agent tools:

```bash
for f in AGENTS.md CLAUDE.md COPILOT.md .cursorrules .clinerules; do
  [ -f "$f" ] && echo "FOUND: $f"
done

for d in .claude .cursor .github .pi; do
  [ -d "$d" ] && echo "FOUND DIR: $d/"
done

[ -f ".github/copilot-instructions.md" ] && echo "FOUND: .github/copilot-instructions.md"
[ -d ".claude/rules" ] && echo "FOUND: .claude/rules/"
[ -d ".claude/skills" ] && echo "FOUND: .claude/skills/"
[ -d ".claude/commands" ] && echo "FOUND: .claude/commands/"
[ -d ".cursor/rules" ] && echo "FOUND: .cursor/rules/"
[ -d ".cursor/skills" ] && echo "FOUND: .cursor/skills/"
[ -d ".pi/skills" ] && echo "FOUND: .pi/skills/"
```

## Step 2: Read and Summarize

For each discovered file or directory, extract only the actionable conventions:

1. **Root instruction files** (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc.) — read them fully.
2. **Rule directories** (`.claude/rules/`, `.cursor/rules/`) — read rule files individually.
3. **Command directories** (`.claude/commands/`, similar tool-specific command folders) — summarize reusable workflows when they materially affect how work should be done.
4. **Skills directories** (`.claude/skills/`, `.cursor/skills/`, `.pi/skills/`) — list what exists and note relevant descriptions.
5. **Settings files** (for example `.claude/settings.json`) — note permissions, model/provider defaults, and workflow constraints.

Present a structured summary like this:

```markdown
## Project Conventions Summary

### Build & Run
- Package manager: ...
- Dev command: ...
- Test command: ...

### Code Style
- ...

### Architecture
- ...

### Agent-Specific Rules
- ...

### Reusable Commands
- ...

### Available Skills
- ...
```

Skip boilerplate. Focus on rules that will change how you work.

## Step 3: Suggest Skill Registration Only If Useful

If the project contains external skill directories that the current toolchain can load, suggest registering them in the local agent configuration. Do this only when the repository clearly uses shared skills and the user would benefit from the integration.

Example:

```json
{
  "skills": ["../.claude/skills"]
}
```

Do not modify configuration unless the user asked for it or the current task clearly requires it.

## Step 4: Highlight What to Remember

After the summary, list the top 3-5 conventions most likely to matter during implementation, such as:
- required commit message formats
- mandatory tests or validation commands
- forbidden patterns
- package manager requirements
- agent workflow requirements

## Step 5: Run a Security and Smell Sweep

Run a lightweight local sweep for real concerns, not hypotheticals.

### Hardcoded secrets

```bash
rg -i --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}'   '(api[_-]?key|secret|token|password|credential|auth)'   --type-not binary -n . | head -20

git ls-files --cached | grep -iE '\.env($|\.)' 2>/dev/null
```

### Insecure code patterns

```bash
rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}'   -e '\beval\s*\(' -e '\bexec\s*\(' -e 'dangerouslySetInnerHTML'   -e '\.innerHTML\s*=' -e 'child_process' -e '\$\(.*\$\{'   --type-not binary -n . | head -20

rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}'   -e 'query\s*\(\s*[`"'"'"'].*\$\{' -e 'execute\s*\(\s*[`"'"'"'].*\+'   --type-not binary -n . | head -20
```

### Suspicious dependencies and config

```bash
[ -f package.json ] && rg '"(pre|post)install)"|"[*]"|"git[+:]|"github:' package.json 2>/dev/null
[ -f package-lock.json ] && [ package.json -nt package-lock.json ] && echo "WARN: package.json newer than lockfile"
[ -f pnpm-lock.yaml ] && [ package.json -nt pnpm-lock.yaml ] && echo "WARN: package.json newer than lockfile"

rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}'   -e "origin:\s*['"]?\*" -e 'Access-Control-Allow-Origin.*\*'   -e "cors.*true" -e 'unsafe-inline' -e 'unsafe-eval'   --type-not binary -n . | head -10

rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}'   -e 'NODE_TLS_REJECT_UNAUTHORIZED.*0' -e 'rejectUnauthorized.*false'   -e 'verify.*false' -e 'insecure.*true'   --type-not binary -n . | head -10
```

### Sensitive files and ignore rules

```bash
git ls-files --cached 2>/dev/null | grep -iE '\.(pem|key|p12|pfx|jks|keystore|sqlite|db)$' | head -10

if [ -f .gitignore ]; then
  for pattern in '.env' 'node_modules' '.DS_Store'; do
    grep -q "$pattern" .gitignore || echo "WARN: .gitignore missing $pattern"
  done
else
  echo "WARN: No .gitignore file found"
fi
```

## Step 6: Report Findings Clearly

Use severity tags and state plainly whether anything needs attention:

```markdown
## 🚩 Security & Code Smell Findings

### [P1] .env file tracked by git
...

### ✅ Nothing Concerning
...
```

Flag real evidence, not speculation.
