<div align="center">

# ⚡ skillstack

**The quality layer for AI agent skills.**

Test, bundle, and sync skills across every coding agent.

[![npm version](https://img.shields.io/npm/v/skillstack.svg)](https://www.npmjs.com/package/skillstack)
[![license](https://img.shields.io/npm/l/skillstack.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-skillstack.dev-7C3AED)](https://docs.skillstack.dev)

```bash
npx skillstack bench
```

</div>

---

## What is this?

**skillstack** is a CLI that adds three layers on top of the [open agent skills ecosystem](https://agentskills.io):

- 📦 **Stacks** — Curated, shareable bundles of skills. Install with one command.
- ⚡ **Bench** — Automated quality scoring. Find out which skills actually help and which are broken.
- 🔀 **Sync** — Cross-agent audit. Find mismatches across Claude Code, Cursor, Codex, and more.

It works with every agent that supports the SKILL.md standard — Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf, Kiro, OpenCode, Roo, Amp, and 50+ others.

## Why?

Thousands of agent skills exist. Three problems:

| Problem | Solution |
|---|---|
| Installing 8 skills takes 8 commands | `skillstack install user/stack` |
| No way to know if a skill actually works | `skillstack bench` |
| Skills installed in Claude Code but not Cursor | `skillstack sync` |

## Install

```bash
npm install -g skillstack
```

Or run without installing:

```bash
npx skillstack <command>
```

## Quick tour

### See what you have

```bash
skillstack list --agents
```

```
Detected agents
  [claude-code]  5 skill(s)
    • frontend-design — Create polished UI components
    • api-testing — Write tests using Jest and Supertest
    ...
```

### Install a curated stack

```bash
skillstack install darcy2002/nextjs-starter
```

Fetches `skillstack.yaml` from GitHub and installs every skill in the bundle.

### Benchmark your skills

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
skillstack bench
```

```
Skill                Score    Δ vs raw   Status
─────────────────────────────────────────────────
frontend-design      92/100   +41        ✅ Strong
react-best-practices 78/100   +22        ✅ Good
api-testing          54/100   +8         ⚠️  Weak
old-webpack-config   31/100   -2         ❌ Broken
─────────────────────────────────────────────────
Tokens: 48,200  ·  Est. cost: $0.14
```

The delta (`Δ vs raw`) measures how much each skill improves output over the raw model. Negative delta = remove the skill.

### Sync across agents

```bash
skillstack sync --dry-run
```

```
┌──────────────────┬────────┬────────┬───────┐
│ Skill            │ Claude │ Cursor │ Codex │
├──────────────────┼────────┼────────┼───────┤
│ frontend-design  │ ✔      │ ✔      │ ✖     │
│ api-testing      │ ✔      │ ⚠      │ ✔     │
└──────────────────┴────────┴────────┴───────┘
  ✔ synced   ⚠ outdated   ✖ missing
```

### Build and share your own stack

```bash
skillstack create     # interactive wizard
skillstack publish    # push to GitHub
```

Anyone can then install with `skillstack install your-username/your-stack`.

## All commands

| Command | What it does |
|---|---|
| `skillstack install <stack>` | Install a stack from GitHub |
| `skillstack bench` | Score installed skills 0-100 |
| `skillstack sync` | Audit and reconcile across agents |
| `skillstack create` | Interactive stack builder |
| `skillstack publish` | Push your stack to GitHub |
| `skillstack list` | Show detected agents + skills |
| `skillstack score <skill>` | Quick bench of one skill |

See the [full documentation](https://docs.skillstack.dev) for every flag and option.

## How bench works

```
1. Scan installed SKILL.md files
2. Use Claude API to generate test prompts per skill
3. Run each prompt twice — with skill, without skill
4. Send both outputs to Claude as a blind judge
5. Score 0-100 and compute delta
```

Cost: roughly **$0.02 per skill**. Benchmarking 10 skills ≈ $0.20.

See [How Bench Works](https://docs.skillstack.dev/bench/how-it-works) for the full methodology.

## Built on `npx skills`

skillstack doesn't reimplement skill installation — we shell out to [`npx skills`](https://www.npmjs.com/package/skills) by Vercel for that. We focus on the three layers nobody else has built: **quality scoring, bundling, and cross-agent sync.**

## Requirements

- Node.js 20+
- At least one coding agent with skill support
- Anthropic API key (only for `bench` and `score` commands)

## Documentation

Full docs at **[docs.skillstack.dev](https://docs.skillstack.dev)**:

- [Quickstart](https://docs.skillstack.dev/quickstart)
- [Command reference](https://docs.skillstack.dev/commands/install)
- [skillstack.yaml schema](https://docs.skillstack.dev/stacks/yaml-reference)
- [How bench works](https://docs.skillstack.dev/bench/how-it-works)
- [CI/CD integration](https://docs.skillstack.dev/guides/ci-integration)

## Contributing

Found a bug? [Open an issue](https://github.com/darcy2002/SkillStack/issues).

Want to contribute? PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [darcy2002](https://github.com/darcy2002)
