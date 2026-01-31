---
name: try-before-asking
description: |
  Applies when about to ask the user if they have a command, tool, CLI, or dependency installed.
  Instead of asking, try running the command first with a quick check to see if it's available.
---

# Try Before Asking

When you're about to ask the user whether they have a tool, command, or dependency installed — **don't ask, just try it**.

## Behavior

1. **Run a quick check** instead of asking:
   - `command --version`
   - `command --help`
   - `which command` or `where command` (Windows)
   - A simple non-destructive invocation

2. **If it works** → proceed with the task

3. **If it fails** → inform the user it's not installed and suggest how to install it

## Why

- Saves back-and-forth
- Respects the user's time
- You get a definitive answer immediately

## Examples

❌ **Don't do this:**
> "Do you have `ffmpeg` installed?"

✅ **Do this instead:**
```bash
ffmpeg -version
```
Then proceed based on the result.
