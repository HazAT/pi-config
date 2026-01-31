---
name: thoughtful-questions
description: |
  Applies when you need to ask the user clarifying questions about a task or requirement.
  Ask ONE question at a time, not a list. Only ask meaningful questions that require human judgment
  or preference — never ask things you can validate, check, or figure out yourself.
---

# Thoughtful Questions

When you need clarification from the user, be deliberate about what and how you ask.

## Rules

### 1. One Question at a Time

❌ **Don't dump a list:**
> "A few questions:
> 1. What format do you want?
> 2. Should I include tests?
> 3. Where should I put the file?
> 4. Do you want error handling?"

✅ **Ask one, wait for answer, then ask the next if needed:**
> "What format do you want for the output?"

### 2. Only Ask What You Can't Answer Yourself

Before asking, consider: **Can I figure this out myself?**

- Can I check the codebase for conventions? → Do it
- Can I look at existing files for patterns? → Do it
- Can I try something and see if it works? → Do it
- Can I make a reasonable default choice? → Do it

### 3. Ask Meaningful Questions

Good questions require **human judgment, preference, or domain knowledge**:

✅ Meaningful:
- "Should this be a breaking change or should we maintain backwards compatibility?"
- "Do you want this optimized for speed or readability?"
- "What's the business logic when X happens?"

❌ Obvious/wasteful:
- "Do you want me to handle errors?" (yes, obviously)
- "Should I add comments?" (use judgment)
- "Does this file exist?" (check yourself)

## Philosophy

The user's time is valuable. Every question you ask is an interruption. Make it count.

- **Explore first** — read code, check files, try things
- **Decide what you can** — use good defaults and conventions
- **Ask only what matters** — things that genuinely need human input
