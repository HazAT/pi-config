---
name: learn-codebase
description: Discover project conventions and surface security concerns. Use when starting work in a new or unfamiliar project, when asked to "learn the codebase", "check project rules", "what are the conventions", "onboard to this project", or "anything shady in this codebase". Scans agent config files (.claude/, .cursor/, CLAUDE.md, etc.) and runs a security/smell sweep for hardcoded secrets, insecure patterns, suspicious dependencies, and dangerous configurations.
---

# Learn Codebase Conventions

Scan the current project for agent instruction files from various tools, summarize the conventions, and optionally register discovered skills in `.pi/settings.json`.

## Step 1: Scan for Convention Files

Search the project root for these files and directories:

```powershell
# Agent instruction files (root-level)
foreach ($file in "CLAUDE.md", "AGENTS.md", "COPILOT.md", ".cursorrules", ".clinerules") {
  if (Test-Path $file) { Write-Host "FOUND: $file" }
}

# Agent config directories
foreach ($dir in ".claude", ".cursor", ".github", ".pi") {
  if (Test-Path $dir -PathType Container) { Write-Host "FOUND DIR: $dir/" }
}

# Deeper convention files
if (Test-Path ".github/copilot-instructions.md") { Write-Host "FOUND: .github/copilot-instructions.md" }

# Claude Code rules, skills, and commands
if (Test-Path ".claude/rules" -PathType Container) { Write-Host "FOUND: .claude/rules/" }
if (Test-Path ".claude/skills" -PathType Container) { Write-Host "FOUND: .claude/skills/" }
if (Test-Path ".claude/commands" -PathType Container) { Write-Host "FOUND: .claude/commands/" }

# Cursor rules
if (Test-Path ".cursor/rules" -PathType Container) { Write-Host "FOUND: .cursor/rules/" }

# Pi project skills
if (Test-Path ".pi/skills" -PathType Container) { Write-Host "FOUND: .pi/skills/" }
```

## Step 2: Read and Summarize

For each discovered file, read its contents and extract key conventions:

1. **Root instruction files** (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc.) — read fully, these are the primary project rules
2. **Rule directories** (`.claude/rules/`, `.cursor/rules/`) — read each rule file
3. **Commands** (`.claude/commands/`) — read each command file. These are reusable prompt workflows from Claude Code (e.g., PR creation, release scripts, review checklists). Summarize what each command does.
4. **Skills directories** (`.claude/skills/`, `.cursor/skills/`) — list available skills and read their descriptions
5. **Settings files** (`.claude/settings.json`) — note permissions and configuration

Present a structured summary to the user:

```
## Project Conventions Summary

### Build & Run
- Package manager: [npm/pnpm/yarn/bun]
- Dev command: [command]
- Test command: [command]

### Code Style
- [Key style rules]

### Architecture
- [Key patterns, structure]

### Agent-Specific Rules
- [Any rules targeted at AI agents]

### Available Commands (from .claude/commands/)
- [command-name] — [what it does]

### Available Skills (from other tools)
- [List skills found in .claude/skills, .cursor/skills]
```

Focus on actionable information. Skip boilerplate and obvious conventions.

## Step 3: Register External Skills

If `.claude/skills/` or other skill directories exist, suggest registering them in `.pi/settings.json` so pi can use them too:

```json
{
  "skills": ["../.claude/skills"]
}
```

Ask the user if they want to create or update `.pi/settings.json` with the discovered skill paths. Only do this if skills were actually found.

## Step 4: Note What to Remember

After summarizing, highlight the **top 3-5 things to keep in mind** while working in this project. These are the conventions most likely to be violated if forgotten — things like:
- Specific commit message formats
- Required co-author lines
- Mandatory test patterns
- Forbidden patterns or anti-patterns
- Package manager preferences (don't use npm when pnpm is required)

## Step 5: Security & Smell Sweep

Scan the codebase for things that look **shady, fishy, or dangerous**. This isn't a full audit — it's a quick sweep to surface anything the user should be aware of. Flag real concerns, not hypotheticals.

### What to Scan

Run these checks and report anything suspicious:

**Hardcoded Secrets & Credentials**
```powershell
# Look for hardcoded secrets, API keys, tokens, passwords
rg -i --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}' '(api[_-]?key|secret|token|password|credential|auth)\s*[:=]\s*["\x27][^"\x27]{8,}' --type-not binary -l | Select-Object -First 20

# .env files committed to repo (should be gitignored)
git ls-files --cached | Select-String -Pattern '\.env($|\.)'
```

**Insecure Code Patterns**
```powershell
# eval(), exec(), dangerouslySetInnerHTML, innerHTML assignments, shell injection vectors
rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}' -e '\beval\s*\(' -e '\bexec\s*\(' -e 'dangerouslySetInnerHTML' -e '\.innerHTML\s*=' -e 'child_process' -e '\$\(.*\$\{' --type-not binary -l | Select-Object -First 20

# Unparameterized SQL (string concatenation in queries)
rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}' -e 'query\s*\(\s*[`"'"'"'].*\$\{' -e 'execute\s*\(\s*[`"'"'"'].*\+' --type-not binary -l | Select-Object -First 20
```

**Suspicious Dependencies**
```powershell
# Check for install/postinstall scripts in dependencies (supply chain risk)
if (Test-Path .\package.json) { Select-String -Path .\package.json -Pattern '"(pre|post)install"' }

# Look for wildcard or git dependencies (unpinned)
if (Test-Path .\package.json) { rg '"[*]"|"git[+:]|"github:' .\package.json }

# Very outdated lock file vs package.json mismatch
if ((Test-Path .\package-lock.json) -and ((Get-Item .\package.json).LastWriteTime -gt (Get-Item .\package-lock.json).LastWriteTime)) { Write-Host "WARN: package.json newer than lockfile" }
if ((Test-Path .\pnpm-lock.yaml) -and ((Get-Item .\package.json).LastWriteTime -gt (Get-Item .\pnpm-lock.yaml).LastWriteTime)) { Write-Host "WARN: package.json newer than lockfile" }
```

**Overly Permissive Configurations**
```powershell
# CORS wildcards, disabled security headers, permissive CSP
rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}' -e "origin:\s*['\"]?\*" -e 'Access-Control-Allow-Origin.*\*' -e "cors.*true" -e 'unsafe-inline' -e 'unsafe-eval' --type-not binary -l | Select-Object -First 10

# Disabled TLS verification, insecure flags
rg --hidden -g '!{.git,node_modules,dist,build,.next,vendor,*.lock}' -e 'NODE_TLS_REJECT_UNAUTHORIZED.*0' -e 'rejectUnauthorized.*false' -e 'verify.*false' -e 'insecure.*true' --type-not binary -l | Select-Object -First 10
```

**File Permissions & Sensitive Files**
```powershell
# Private keys, certificates, or database files in repo
git ls-files --cached | Select-String -Pattern '\.(pem|key|p12|pfx|jks|keystore|sqlite|db)$' | Select-Object -First 10

# Check .gitignore exists and covers basics
if (Test-Path .\.gitignore) {
  foreach ($pattern in '.env', 'node_modules', '.DS_Store') {
    if (-not (Select-String -Path .\.gitignore -Pattern [regex]::Escape($pattern) -Quiet)) { Write-Host "WARN: .gitignore missing $pattern" }
  }
} else {
  Write-Host "WARN: No .gitignore file found"
}
```

### How to Report

Present findings in a dedicated section with severity tags. Be direct — no sugarcoating, but also no false alarms.

```
## 🚩 Security & Code Smell Findings

### [P0] Hardcoded API key in src/config.ts
Line 42 has a Stripe secret key directly in source code.
This should be in an environment variable, not committed.

### [P1] .env file tracked by git
`.env.production` is committed and contains database credentials.
Add to `.gitignore` and rotate the exposed credentials.

### [P2] eval() usage in src/utils/parser.ts
Used to parse user-supplied expressions. Consider a safe parser
like `JSON.parse()` or a sandboxed evaluator instead.

### ✅ Nothing Concerning
[If sweep is clean, say so explicitly — don't manufacture findings.]
```

**Severity guide (same as review rubric):**
- **[P0]** — Actively dangerous. Exposed secrets, SQL injection, RCE vectors. Fix now.
- **[P1]** — Genuine risk. Someone will get bitten by this. Should fix soon.
- **[P2]** — Worth knowing about. Not urgent, but the user should be aware.

**Do NOT flag:**
- Test files using eval/exec for testing purposes
- Known development-only insecure configs (like localhost CORS in dev servers)
- Theoretical issues with no concrete exploit path in this codebase
- Dependencies that are simply old (that's not a security finding without a known CVE)
