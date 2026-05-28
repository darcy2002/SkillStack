# ⚡ skillstack

> Curated, tested, shareable agent skill bundles for the open agent-skills ecosystem.

![demo](./assets/demo.gif)

## Why?

Agent skills are exploding — Vercel's `npx skills` already supports 50+ agents and hundreds of community skills. But three problems remain:

- **Skill sprawl.** No one has time to hand-pick the right 10 skills for a Next.js project, or a Python backend, or a DevOps workflow.
- **No quality signal.** Some skills are gold. Some make your agent worse. There's no way to tell which is which before you install.
- **Agent fragmentation.** You install a skill in Cursor; your teammate uses Claude Code; another uses Codex. The same skill, three formats, no way to keep them in sync.

`skillstack` fixes all three.

## What?

Three layers on top of `npx skills`:

- **Stacks** — curated bundles described by a `skillstack.yaml` in any GitHub repo. One command installs the whole set.
- **Bench** — actually score installed skills. We auto-generate test prompts, run each with-and-without the skill, blind-grade the outputs with Claude, and produce a scorecard.
- **Sync** — cross-agent audit. See which skills are installed where, find drift, reconcile.

## Quick start

```bash
# Install a community stack
npx skillstack install vercel/skillstack-nextjs

# Benchmark everything you have installed
export ANTHROPIC_API_KEY=...
npx skillstack bench

# Audit & sync across all your agents
npx skillstack sync
```

## Commands

| Command | What it does |
|---|---|
| `skillstack install [stack]` | Install a stack from GitHub or a local `skillstack.yaml` |
| `skillstack list [--agents]` | List installed stacks and skills |
| `skillstack bench [--json] [--md]` | Score every installed skill |
| `skillstack score <skill>` | Quick benchmark for a single skill |
| `skillstack sync [--dry-run]` | Audit + reconcile skills across agents |
| `skillstack create` | Interactive stack builder |
| `skillstack publish` | Push your stack to GitHub |

## Example `skillstack.yaml`

```yaml
name: nextjs-pro
author: devanshi
version: 0.1.0
description: A curated stack for Next.js teams shipping production frontends.
agents: [claude-code, cursor]
skills:
  - source: vercel/skills
    skill: frontend-design
  - source: vercel/skills
    skill: tailwind-best-practices
  - source: anthropic/skills
    skill: testing-strategy
bench:
  tasks_per_skill: 3
  model: claude-sonnet-4-6
```

## Example bench output

```
┌────────────────────────┬─────────┬──────────┬──────────┐
│ Skill                  │ Score   │ Δ vs raw │ Status   │
├────────────────────────┼─────────┼──────────┼──────────┤
│ frontend-design        │ 92/100  │ +34      │  Strong  │
│ tailwind-best-practices│ 81/100  │ +18      │  Strong  │
│ testing-strategy       │ 64/100  │ +7       │   Weak   │
│ obsolete-css-grid      │ 28/100  │ -12      │  Broken  │
└────────────────────────┴─────────┴──────────┴──────────┘

  ⚠ Conflicts detected:
    → frontend-design & tailwind-best-practices both trigger on: css, layout, design  (52% overlap)

  ──────────────────────────────────────────────────────────
  Model: claude-sonnet-4-6   Tokens: 18,420   Est. cost: $0.11
```

## Example sync output

```
┌────────────────────┬─────────────┬────────┬────────┬──────────┐
│ Skill              │ claude-code │ cursor │ codex  │ Source   │
├────────────────────┼─────────────┼────────┼────────┼──────────┤
│ frontend-design    │      ✔      │   ⚠    │   ✖    │ claude   │
│ debug              │      ✔      │   ✔    │   ✔    │ claude   │
│ python-format      │      ✖      │   ✔    │   ✖    │ cursor   │
└────────────────────┴─────────────┴────────┴────────┴──────────┘
  ✔ synced   ⚠ outdated   ✖ missing   ● only-here
```

## How bench works

```
1. Scan      — read every SKILL.md from every detected agent
2. Generate  — Claude generates 3 realistic test prompts per skill
3. Run       — each prompt runs twice: with the skill in the system prompt, without
4. Grade     — Claude judges both outputs blind (A/B randomized) on 0–100
5. Report    — terminal scorecard + bench-report.json + bench-report.md
```

## Cost

Benchmarking is ~$0.02 per skill (3 tasks × 2 runs × 1 grade ≈ 6 Claude calls). Ten skills runs you about **$0.15**.

## Install

```bash
npm install -g skillstack
# or just use npx
npx skillstack <command>
```

## Contributing

Stacks are just GitHub repos with a `skillstack.yaml`. Build one, publish it with `skillstack publish`, share the install command — that's the entire ecosystem.

PRs welcome. See [PROMPTS.md](./PROMPTS.md) for the build phases.

## License

MIT
