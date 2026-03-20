---
name: skill-creator
description: Create new agent skills following the Agent Skills specification. Use when asked to "create a skill", "add a new skill", "write a skill", "make a skill", or scaffold a new skill with SKILL.md. Guides through requirements, planning, writing, registration, and verification with portable, local-first conventions.
---

<!--
Adapted from upstream skill-creator guidance:
https://github.com/anthropics/skills/tree/main/skills/skill-creator
https://github.com/openai/skills/tree/main/skills/.system/skill-creator
-->

# Create a New Skill

Guide the user through creating an agent skill that stays portable across tools whenever possible. Work locally first; only involve a stronger hosted model when the skill design itself is unusually complex or the user explicitly wants hosted-specific extensions.

Resolve supporting files relative to this skill directory.

## Step 1: Understand the Skill

Gather requirements before writing anything.

Ask:
1. What should the skill do?
2. When should an agent use it?
3. What tools does it need?
4. Where should it live?

Determine the skill name:
- lowercase letters, digits, and hyphens only
- 1-64 characters
- descriptive and unique
- action-oriented when possible

Choose a complexity tier:

| Tier | Structure | Use when |
|---|---|---|
| Simple | `SKILL.md` only | The instructions are self-contained. |
| With references | `SKILL.md` + `references/` | The skill needs reusable domain knowledge. |
| With scripts | `SKILL.md` + `scripts/` | The workflow benefits from automation. |
| Full | All of the above | The skill needs both automation and references. |

Read `skills/skill-creator/references/design-principles.md` for guidance on keeping the skill focused.

## Step 2: Plan the Skill

For each expected use case, identify what belongs in:
- `scripts/` for repeated automation
- `references/` for reusable decision support
- `assets/` for static templates or files copied into outputs

## Step 3: Study Existing Skills

Read 1-2 nearby skills that match the target tier so the new skill follows local conventions.

Also read the repository's `AGENTS.md` or equivalent instruction files before writing.

## Step 4: Write `SKILL.md`

Create `<skill-directory>/<name>/SKILL.md`.

### Frontmatter

The YAML frontmatter must be the first content in the file.

```yaml
---
name: <skill-name>
description: <what it does>. Use when <trigger phrases>. <key capabilities>.
---
```

Required fields:
- `name`
- `description`

Useful optional fields:
- `allowed-tools`
- `license`
- `metadata`
- `compatibility`

Prefer portable fields from the Agent Skills spec. If a specific runtime supports extra frontmatter fields, treat them as optional add-ons and document them separately instead of making them the default design.

### Description guidelines

The description is the main trigger surface. Write it in third person and include natural phrases users would actually say.

Pattern:
`<What it does>. Use when <trigger phrases>. <Key capabilities>.`

### Body guidelines

Write instructions in imperative voice.

Recommended structure:
1. one-line summary
2. sequential steps with `## Step N` headings
3. decision tables where useful
4. concrete examples
5. validation or exit criteria

Read these references as needed:
- `skills/skill-creator/references/workflow-patterns.md`
- `skills/skill-creator/references/output-patterns.md`
- `skills/skill-creator/references/skill-patterns.md`

Keep `SKILL.md` concise. Move long reference material into `references/` files.

### Attribution

If the skill adapts external material, add an attribution comment after the frontmatter.

## Step 5: Create Supporting Files

### References

Use `references/` for information the agent should load selectively.

Reference them from `SKILL.md` with paths relative to the repo or skill directory, for example:

```markdown
Read `skills/example/references/topic-a.md` for details on [topic].
```

### Scripts

Use `scripts/` for automation that benefits from Python.

Requirements:
- execute with `uv run`
- include PEP 723 metadata when dependencies are needed
- document the script interface in `SKILL.md`
- output structured data when that helps downstream steps
- run from the repository root unless the skill says otherwise

### Assets

Use `assets/` for templates or static files that are copied into outputs.

## Step 6: Validate the Skill

Run the bundled validator:

```bash
uv run ./skills/skill-creator/scripts/quick_validate.py <path/to/skill-directory>
```

Fix issues and re-run until it passes.

Optionally run an external validator such as:

```bash
skills-ref validate <path/to/skill-directory>
```

## Step 7: Register the Skill

Registration depends on the repo and runtime.

1. confirm the directory name matches the `name` field
2. update any skills index or README table
3. update runtime-specific config only if that runtime is actually in use
4. document any optional hosted-runtime extensions separately from the portable core

## Step 8: Verify

Before finishing, confirm that:
- the description contains useful trigger phrases
- the instructions match the chosen complexity tier
- scripts and references are only included when necessary
- the validator passes
- the skill stays portable unless the user explicitly asked for a runtime-specific feature
