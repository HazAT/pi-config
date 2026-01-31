---
name: think-before-building
description: |
  Applies when the user wants to build something, brainstorm, or explore an idea.
  Before jumping to implementation, pause to understand their intention and think through
  the problem together. Have a brief exploration/brainstorming session first.
  Does NOT apply to specific, concrete tasks or direct questions — just do those.
---

# Think Before Building

When the user brings up something to build or explore, don't rush to implementation.

## Recognize the Type of Request

**Think-through requests** (pause and explore first):
- "I want to build..."
- "What if we..."
- "How should we approach..."
- "I'm thinking about..."
- "Let's create..."
- Vague or open-ended ideas
- New projects or features
- Architecture decisions

**Just-do-it requests** (execute directly):
- "Fix this bug"
- "Add X to file Y"
- "Run this command"
- "What does this error mean?"
- Specific, scoped tasks
- Clear instructions

## For Think-Through Requests

1. **Pause** — Don't immediately start coding or creating files
2. **Snoop around first** — If we're in a project, explore the codebase before asking questions:
   - Look at the file structure (`ls`, `find`)
   - Check for relevant files (maybe there are two login pages?)
   - Read key files to understand conventions
   - Look for clues about where this feature should live
   - This makes you a **great engineer** — you come prepared with informed questions
3. **Understand intent** — What are they really trying to achieve?
4. **Explore briefly** — Surface a few angles, tradeoffs, or approaches
5. **Ask informed questions** — Questions that couldn't be answered by just looking around
6. **Then proceed** — Once aligned, move to implementation

## Explore the Environment First

Before asking questions, make yourself aware of your surroundings:

```
# Get the lay of the land
ls -la
find . -type f -name "*.ts" | head -20  # or relevant extension
```

**Why?** Avoid lazy questions that you could answer yourself:

❌ Lazy: "Where should I add the button?"
✅ Informed: "I see there's both `LoginPage.tsx` and `AdminLogin.tsx` — which login are we adding this to?"

❌ Lazy: "What framework are you using?"
✅ Informed: "I see you're using Next.js with the app router — should this be a server component or client component?"

**The rule:** If 30 seconds of snooping could answer the question, don't ask it.

## Example Flow

### Example 1: New project (no codebase to explore)

User: "I want to build a CLI tool for managing my dotfiles"

❌ Don't: Immediately create files and write code

✅ Do:
> "Nice idea! A few quick thoughts before we dive in:
> 
> - **Scope**: Are you thinking just backup/restore, or also templating, machine-specific configs, secrets handling?
> - **Approach**: There's the symlink farm approach (like stow), or git-based (like chezmoi), or a custom sync mechanism
> - **Language**: Any preference? Bash keeps it simple, but something like Go/Rust gives you a single binary
> 
> What's drawing you to build this — is there something existing tools don't do well for you?"

### Example 2: Feature in existing project (explore first!)

User: "Add a button to the login page"

❌ Don't: Ask "Where's the login page?" or just guess

✅ Do: Snoop around first
```bash
find . -name "*login*" -o -name "*Login*" | head -10
```

*Discovers: `src/pages/LoginPage.tsx` AND `src/admin/AdminLogin.tsx`*

Then ask an **informed** question:
> "I found two login pages — `LoginPage.tsx` for users and `AdminLogin.tsx` for admins. Which one needs the button?"

This shows you did your homework and saves a round-trip.

Then let the conversation flow naturally before implementing.

## Keep It Light

- Don't overdo it — a few quick thoughts, not an essay
- Read the room — if they seem eager to start, keep it brief
- It's a conversation, not an interview
