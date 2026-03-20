---
name: github
description: "Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries."
license: From mitsuhiko/agent-stuff
---

# GitHub Skill

Use the `gh` CLI for GitHub operations. Prefer local CLI inspection first; escalate to Codex or another hosted model only when you need broader synthesis across large review threads, CI output, or repository history.

## Basic Guidance

- Run commands from the target repository when possible.
- When outside a git directory, pass `--repo owner/repo` or use a full GitHub URL.
- Prefer `--json` plus `--jq` when you need structured output for follow-up steps.

## Pull Requests

Check CI status on a PR:
```bash
gh pr checks 55 --repo owner/repo
```

List recent workflow runs:
```bash
gh run list --repo owner/repo --limit 10
```

View a run and inspect failed steps:
```bash
gh run view <run-id> --repo owner/repo
```

View logs for failed steps only:
```bash
gh run view <run-id> --repo owner/repo --log-failed
```

## API for Advanced Queries

Use `gh api` when the standard subcommands do not expose the needed data.

```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

## JSON Output

Most `gh` commands support `--json` for machine-readable output.

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```
