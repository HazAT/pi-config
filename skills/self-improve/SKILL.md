---
name: self-improve
description: |
  Triggered when users teach pi new behaviors or preferences using natural language.
  Activates on phrases like: "Hey pi, remember that...", "yo pi, always...", "pi, please from now on...",
  "pi, learn that...", "pi, when I ask X do Y", or any direct instruction to change pi's behavior.
  First reviews ALL existing skills to see if the preference fits/refines one of them before creating new.
  Updates existing skills when possible; only creates new skills when truly necessary.
---

# Self-Improve Skill

When a user gives you a direct instruction about how you should behave, create a new skill to remember it.

## Trigger Patterns

Watch for phrases like:
- "Hey pi, remember that..."
- "yo pi, always..."  
- "pi, please from now on..."
- "pi, learn that..."
- "pi, when you X, please Y"
- "pi, don't ask me about X, just do Y"
- "pi, I prefer..."
- Any direct second-person instruction to change your behavior

## Process

1. **Understand** - Parse what the user wants you to remember/change
2. **Memory or Skill?** - Reflect first:
   - **Memory** = a FACT about the environment ("this is Windows", "project uses pnpm")
   - **Skill** = a BEHAVIOR I should adopt ("ask one question at a time", "think before building")
   - If it's a fact → use the `remember` tool instead of creating a skill
   - If it's a behavior → continue to create/update a skill
4. **Review existing skills** - Read through ALL existing skills one by one to see if this preference:
   - Fits naturally into an existing skill (→ update that skill)
   - Could refine/polish an existing skill's instructions
   - Requires updating an existing skill's trigger description
   - Truly needs a new skill (only if it doesn't fit anywhere)
5. **Update or Create**:
   - **If it fits an existing skill** → Edit that skill's SKILL.md to incorporate the new behavior
   - **If it's genuinely new** → Create a new skill (continue to step 6)
6. **Name it** - Create a short, descriptive kebab-case name (e.g., `try-before-asking`, `one-question-at-a-time`)
7. **Describe it** - Write a clear description of when this behavior should trigger
8. **Write instructions** - Document the behavior clearly so future sessions follow it
9. **Save** - Create the skill in `~/.pi/agent/skills/`

## Creating the New Skill

```bash
# Create skill directory
mkdir -p ~/.pi/agent/skills/<skill-name>
```

Then write a `SKILL.md` file with this structure:

```markdown
---
name: <skill-name>
description: <When this should trigger - be specific! Max 1024 chars>
---

# <Skill Title>

<Clear instructions for the behavior the user wants>

## Examples

<Optional: concrete examples of the behavior in action>
```

## Guidelines

- **Check existing skills first** - Always review all skills before creating new ones
- **Prefer updating** - If a preference fits an existing skill, update it rather than fragmenting
- **Refine triggers** - Update the skill's description if the trigger conditions need broadening
- **Be specific** in the description so the skill triggers appropriately
- **Keep it focused** - one behavior per skill
- **Use the user's words** when possible to capture intent
- **Confirm** with the user what you created (or updated)

## Example

User: "Hey pi, remember that when you ask if I have a tool installed, just try it first"

Creates `~/.pi/agent/skills/try-before-asking/SKILL.md`:

```markdown
---
name: try-before-asking
description: |
  Applies when about to ask the user if they have a command, tool, or dependency installed.
  Instead of asking, try running the command first to check availability.
---

# Try Before Asking

When you're about to ask the user whether they have a tool/command installed:

1. **Don't ask** - Just try running the command with a simple check (e.g., `command --version`, `which command`, or `command --help`)
2. **Handle the result** - If it works, proceed. If it fails, then inform the user and suggest installation.
3. **Keep it simple** - Use quick, non-destructive checks

This avoids unnecessary back-and-forth and respects the user's time.
```

## After Creating

Tell the user:
1. What skill name you chose
2. What it will do
3. That it's now active for all future pi sessions
4. They can view/edit it at `~/.pi/agent/skills/<name>/SKILL.md`
5. They can delete it anytime by removing that directory
