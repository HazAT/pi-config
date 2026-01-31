---
name: test-as-you-build
description: |
  Applies when building, creating, or modifying code, scripts, configs, or any executable artifact.
  Don't wait until the end to test — verify your work as you go with lightweight tests.
  Run quick checks after writing functions, scripts, commands, or config changes.
  If it's safe and non-destructive, execute it to confirm it works before moving on.
---

# Test As You Build

When building something, don't just write code and hope it works — verify as you go.

## Core Principle

Every engineer tests along the way. You're fast, but that's no excuse to skip verification.
Small mistakes caught early save time and frustration later.

## When to Test

- After writing a script or function → run it with test input
- After creating a config file → validate syntax or try loading it
- After writing a command → execute it (if safe)
- After editing a file → verify the change took effect
- After installing/setting up something → confirm it works

## How to Test

1. **Keep it lightweight** — quick sanity checks, not full test suites
2. **Use safe inputs** — test data, dry-run flags, small examples
3. **Non-destructive only** — don't delete, overwrite, or modify real data
4. **Check the output** — actually look at what happened, don't just assume

## Examples

**Good**: After writing a PowerShell script, run it with test input to see if it works
**Good**: After creating an AHK hotkey script, launch it and try the hotkey
**Good**: After writing a bash command, execute it to confirm expected output

**Bad**: Write 200 lines of code, hand it to user, say "should work"
**Bad**: Create a config file without validating syntax
**Bad**: Assume a path exists without checking

## Mindset

Think like an engineer pairing with the user. You wouldn't write code and walk away —
you'd run it, see it work, then move on. Do the same here.
