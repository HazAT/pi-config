---
name: reload-after-skill
description: |
  Applies immediately after creating a new skill via the self-improve workflow.
  After writing a new SKILL.md file, use the prefill_editor tool to prefill '/reload' 
  so the user just presses Enter to activate the skill instantly.
---

# Reload After Creating Skills

When you create a new skill, make it immediately available by prompting a reload.

## Process

1. **Create the skill** — Write the SKILL.md as usual
2. **Prefill reload** — Use the `prefill_editor` tool to prefill `/reload` in the editor
3. **Tell the user** — Let them know they just need to press Enter
4. **After reload** — The skill is active and can be invoked

## How to Prefill

After creating a skill, call:

```
prefill_editor(text: "/reload", message: "Press Enter to reload and activate your new skill!")
```

This puts `/reload` in the editor so the user just presses Enter.

## Why

Without reloading, newly created skills won't be in the system prompt until the next session. 
By prefilling `/reload`, we make activation effortless — just one keypress.
