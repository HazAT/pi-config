---
name: iterate-pr
description: Iterate on a PR until CI passes. Use when you need to fix CI failures, address review feedback, or continuously push fixes until all checks are green. Automates the feedback-fix-push-wait cycle.
license: Adapted from getsentry/skills
---

# Iterate on PR Until CI Passes

Continuously iterate on the current branch until CI checks pass and blocking review feedback is addressed. Keep the loop local by default; escalate to Codex only when you need stronger reasoning for hard failures, broad review synthesis, or risky fixes.

**Requires:** `gh` authenticated, Python 3.9+, and `uv`.

Resolve bundled script paths relative to this skill directory.

## Bundled Scripts

### `scripts/fetch_pr_checks.py`

```bash
uv run ./skills/iterate-pr/scripts/fetch_pr_checks.py [--pr NUMBER]
```

Fetches CI status and failure snippets as JSON.

### `scripts/fetch_pr_feedback.py`

```bash
uv run ./skills/iterate-pr/scripts/fetch_pr_feedback.py [--pr NUMBER]
```

Fetches PR review feedback grouped by priority.

## Workflow

### 1. Identify the PR

```bash
gh pr view --json number,url,headRefName
```

Stop if the current branch has no PR.

### 2. Gather review feedback

Run the feedback script and classify what must be handled now.

### 3. Handle feedback by priority

**Auto-fix without prompting:**
- `high`
- `medium`

When fixing feedback:
- understand the root cause
- look for similar nearby issues
- fix all relevant instances, not just the cited line

**Ask the user about low-priority items:**
- `low`

**Skip silently:**
- `resolved`
- informational `bot` comments

### 4. Reply on review threads when appropriate

For inline comments with `thread_id`, reply after fixing the issue or deciding it is a false positive. Avoid duplicate bot/agent replies.

### 5. Check CI status

Run the checks script. If important review bots are still pending, wait before proceeding.

### 6. Fix CI failures

For each failed check:
1. read the failure snippet
2. inspect the relevant code and surrounding context
3. fix the root cause with targeted edits
4. run the affected tests, lints, or type checks locally

Do not guess from the check name alone.

### 7. Verify, commit, and push

Before pushing, re-run the local checks that cover your change.

Use the `commit` skill for commit messages, then push:

```bash
git push
```

### 8. Monitor and repeat

Poll checks and feedback in a loop:
1. fetch checks
2. if all pass, perform one final feedback sweep
3. if failures appear, fix them and return to local verification
4. if checks are pending, sleep 30 seconds and poll again

## Exit Conditions

**Success:** checks pass and there is no remaining unaddressed high/medium feedback.

**Ask for help:** the same failure persists after two attempts, the problem is infra-related, or the feedback needs human judgment.

**Stop:** no PR exists for the branch or the branch needs a rebase.

## Fallback

If the scripts fail, use `gh` directly:
- `gh pr checks --json name,state,bucket,link`
- `gh run view <run-id> --log-failed`
- `gh api repos/{owner}/{repo}/pulls/{number}/comments`
