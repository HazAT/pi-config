---
name: thoughtful-questions
description: |
  Applies when you need to ask the user clarifying questions about a task or requirement.
  Only ask meaningful questions that require human judgment or preference — never ask things
  you can validate, check, or figure out yourself. When you have multiple questions, use
  the execute_command tool to self-invoke /answer for a structured Q&A experience.
---

# Thoughtful Questions

When you need clarification from the user, be deliberate about what and how you ask.

## Rules

### 1. Only Ask What You Can't Answer Yourself

Before asking, consider: **Can I figure this out myself?**

- Can I check the codebase for conventions? → Do it
- Can I look at existing files for patterns? → Do it
- Can I try something and see if it works? → Do it
- Can I make a reasonable default choice? → Do it

### 2. Ask Meaningful Questions

Good questions require **human judgment, preference, or domain knowledge**:

✅ Meaningful:
- "Should this be a breaking change or should we maintain backwards compatibility?"
- "Do you want this optimized for speed or readability?"
- "What's the business logic when X happens?"

❌ Obvious/wasteful:
- "Do you want me to handle errors?" (yes, obviously)
- "Should I add comments?" (use judgment)
- "Does this file exist?" (check yourself)

### 3. Multiple Questions? Use /answer

When you have multiple questions to ask, **don't make the user answer inline**. Instead:

1. **Format questions clearly** — End each with `?` so the extractor can find them
2. **Self-invoke /answer** — Use the `execute_command` tool to run `/answer` after your response

Example flow:
```
You: "I have a few questions about the implementation:

1. Should we use REST or GraphQL for the API?
2. Do you want authentication on all endpoints or just write operations?
3. What's the expected request volume — do we need rate limiting?"

[execute_command tool: command="/answer", reason="Opening Q&A interface for the user to answer these questions"]
```

The `/answer` tool extracts your questions and presents an interactive UI where the user can navigate and answer each one efficiently.

## Philosophy

The user's time is valuable. Every question you ask should be meaningful.

- **Explore first** — read code, check files, try things
- **Decide what you can** — use good defaults and conventions
- **Ask only what matters** — things that genuinely need human input
- **Make it easy to answer** — use `/answer` for multiple questions
