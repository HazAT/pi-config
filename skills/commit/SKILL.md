---
name: commit
description: "Read this skill before making git commits"
license: From mitsuhiko/agent-stuff
---

Create a git commit for the current changes using Conventional Commits format with a polished, descriptive message.

## Routing Guidance

Use local tooling for the normal workflow: inspect the diff, stage intentionally, and write a strong subject/body pair. Escalate to a stronger hosted model only when the diff is unusually large or you need help synthesizing a concise commit narrative across many files.

## Format

`<type>(<scope>): <summary>`

- `type` REQUIRED. Use `feat` for new features, `fix` for bug fixes. Other common types: `docs`, `refactor`, `chore`, `test`, `perf`.
- `scope` OPTIONAL. Use a short noun for the affected area.
- `summary` REQUIRED. Keep it imperative, under 72 characters, with no trailing period.

## Notes

- Include a body unless the change is trivially obvious.
- Explain what changed, why it changed, and any notable decisions.
- Do not add breaking-change footers or sign-offs.
- Only commit. Do not push.
- If the requested commit scope is ambiguous, clarify before staging unrelated files.
- Treat caller-provided arguments as commit guidance. File paths limit scope; freeform instructions should shape the message.

## Steps

1. Infer any file-path restrictions or extra commit instructions from the prompt.
2. Review `git status` and `git diff` for the intended files.
3. Optionally inspect recent commit subjects with `git log -n 50 --pretty=format:%s` to match local scope naming.
4. Stage only the intended files.
5. Write a Conventional Commit subject and an informative body.
6. Run `git commit -m "<subject>"` and add a second `-m` for the body when needed.
