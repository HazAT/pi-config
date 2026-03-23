# Agent Guide

This is the practical playbook for choosing the right Benzpi agent.

## Quick Picks

Use `worker` when:
- the task is mixed-stack or generic
- no single technology clearly dominates
- you just need the default execution path

Use `python-worker` when:
- the task is mainly Python
- you need better handling of environments, dependencies, scripts, or pytest
- the verification step should be Python-aware rather than generic

Example prompts:
- `Implement this Python CLI flag and verify it with the smallest relevant test.`
- `Fix this failing pytest without changing unrelated tooling.`

Use `dotnet-worker` when:
- the task is mainly C# or .NET
- the repo is driven by `.sln` and `.csproj` structure
- build or test verification should be done with `dotnet`

Example prompts:
- `Fix this failing .NET test and verify with dotnet test.`
- `Implement this ASP.NET endpoint change and build the affected project.`

Use `docker-worker` when:
- the main work is in Dockerfiles, Compose, or local service wiring
- you need to reason about ports, logs, volumes, build contexts, or container health
- the task is about reproducible local environments

Example prompts:
- `Debug why this compose stack will not start locally.`
- `Update the Dockerfile for a faster local rebuild and verify the image still builds.`

Use `env-doctor` when:
- the toolchain itself is broken
- Pi cannot see the right model
- MCP will not connect
- Docker or another local dependency is failing before code even runs

Example prompts:
- `Diagnose why pi-local is not available even though my llama server is running.`
- `Figure out why Docker compose fails on startup on this machine.`

## Supporting Agents

Use `scout` when:
- the codebase is unfamiliar
- you want a fast map of files, patterns, and gotchas before implementation

Use `planner` when:
- the scope is fuzzy
- you need decisions, architecture, or TODO breakdowns before coding

Use `reviewer` when:
- implementation is done and you want a correctness and risk pass

Use `researcher` when:
- the task needs external information, documentation, or ecosystem research

## Selection Rules

- Prefer a specialist worker when the main task is clearly Python, .NET, or Docker.
- Prefer `worker` when the task crosses multiple areas and no specialist obviously owns it.
- Start with `scout` if the repo shape is unclear.
- Start with `planner` if the requirement or design is still fuzzy.
- Use `reviewer` after substantial implementation work.
- Use `env-doctor` for setup and integration failures instead of mixing diagnosis into feature work.

## When Not To Use A Specialist

Do not use `python-worker` when Python is incidental to a broader task.

Do not use `dotnet-worker` for Unity-specific work or generic environment debugging.

Do not use `docker-worker` when the real problem is application logic inside an otherwise healthy container setup.

Do not use `env-doctor` for normal feature implementation.

## Common Workflows

### New Python Utility

1. Use `scout` if the repo is unfamiliar.
2. Use `python-worker` to implement the utility.
3. Use `reviewer` if the change is substantial.

### Fix .NET Test Failure

1. Use `dotnet-worker`.
2. Verify with targeted `dotnet test`.
3. Use `reviewer` if the fix changed shared code paths.

### Debug Docker Compose Stack

1. Use `docker-worker`.
2. If the machine or Docker install itself looks broken, switch to `env-doctor`.

### Local Backend Not Responding

1. Use `env-doctor`.
2. If the environment recovers and code changes are still needed, hand off to the right worker.
