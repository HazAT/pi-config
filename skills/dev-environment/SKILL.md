---
name: dev-environment
description: Use when starting, stopping, or configuring Docker services, setting up new projects with Docker, checking what's running, or accessing local development URLs. Use when any docker-compose or container management is needed.
---

# Dev Environment Management

## Overview

All local development runs in **Docker via OrbStack**. The goal is that **dev mirrors prod** — same Dockerfile, same services, same ports. The only difference in dev is volume-mounting source code so files can be edited natively on the host machine. This means:

- **One Dockerfile** for dev and prod (multi-stage is fine, but the runtime is the same)
- **`docker-compose.yml`** holds the shared/prod config (image, ports, env, dependencies)
- **`docker-compose.dev.yml`** only adds dev conveniences: source volume mounts, dev server command, maybe hot-reload flags — nothing else
- All file editing, git operations, and tooling run **natively on macOS**, not inside the container
- The container just provides the runtime, dependencies, and services

Every container gets a `<name>.orb.local` domain via OrbStack. Web services listen on **port 80 internally** so they're accessible as clean URLs without port numbers.

## Docker Compose Structure

```yaml
# docker-compose.yml — shared config, close to prod
services:
  app:
    build: .
    ports:
      - "3000:80"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  redis:
    image: redis:7-alpine

# docker-compose.dev.yml — dev overrides ONLY
services:
  app:
    build:
      target: deps          # stop at deps stage, skip production build
    command: npx vite dev --host --port 80
    volumes:
      - ./src:/app/src      # mount source for live editing
      - ./static:/app/static
```

Keep dev overrides minimal. If a config exists in the dev override but not prod, ask yourself if it should be in the base compose instead.

## Container URL Convention

OrbStack resolves `<container-name>.orb.local` directly to the container's IP. Web services MUST listen on port 80 inside the container so they're accessible without specifying a port.

| Access pattern | Example |
|---|---|
| OrbStack domain (preferred) | `http://carinspecter24-app-1.orb.local` |
| localhost fallback | `http://localhost:3000` |

## Docker Compose Port Pattern

Map a localhost fallback port to container port 80. The app inside listens on port 80.

```yaml
# docker-compose.yml
services:
  app:
    ports:
      - "3000:80"  # localhost:3000 -> container:80
```

For dev servers (vite, next, etc.), override the listen port:

```yaml
# docker-compose.dev.yml
services:
  app:
    command: npx vite dev --host --port 80
```

For production Dockerfiles, set `PORT=80`:

```dockerfile
ENV PORT=80
EXPOSE 80
```

## Quick Reference Commands

```bash
# What's running?
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Access URLs for all web containers
docker ps --format "{{.Names}}" | xargs -I{} echo "http://{}.orb.local"

# Start a project (dev)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Stop a project
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Logs
docker logs <container-name> --tail 50 -f

# Check if a domain resolves
ping -c 1 <container-name>.orb.local
```

## Known Projects

| Project | Compose location | Web container | URL | localhost |
|---|---|---|---|---|
| carinspecter24 | `~/Projects/carinspecter24/` | `carinspecter24-app-1` | `http://carinspecter24-app-1.orb.local` | `localhost:3000` |
| vanguard | `~/Projects/vanguard/` | (postgres only, no web UI) | `vanguard-postgres-1.orb.local:5432` | `localhost:5432` |

Update this table when adding new projects.

## Setting Up a New Project

1. Write a **single Dockerfile** that works for prod (port 80, `ENV PORT=80`, `EXPOSE 80`)
2. Create `docker-compose.yml` with the prod-like config (image, ports `"<unique>:80"`, env, services)
3. Create `docker-compose.dev.yml` with **only** dev overrides: source volume mounts, dev server command
4. Start with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
5. Verify: `curl -s -o /dev/null -w "%{http_code}" http://<container>.orb.local`
6. Add to the Known Projects table above

## Non-Web Services

Services like Redis, Postgres, etc. don't need port 80. Access them via their standard port on the `.orb.local` domain:

- `redis-container.orb.local:6379`
- `postgres-container.orb.local:5432`

## Important Notes

- Multiple containers can all listen on port 80 — each gets its own IP from OrbStack
- Pin database images to major versions (e.g. `postgres:17`) — never use `latest`
- Postgres 18+ changed the data directory layout; use `postgres:17` unless you update the volume mount from `/var/lib/postgresql/data` to `/var/lib/postgresql`
