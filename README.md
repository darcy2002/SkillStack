<div align="center">

# ⚡ skillrank

**The quality layer for AI agent skills.**

Test, bundle, and sync skills across every coding agent.

[![npm version](https://img.shields.io/npm/v/skillrank.svg)](https://www.npmjs.com/package/skillrank)
[![license](https://img.shields.io/npm/l/skillrank.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-skillrank.dev-7C3AED)](https://docs.skillrank.dev)

```bash
npx skillrank bench
```

</div>

---

## What is this?

**skillrank** is a CLI that adds three layers on top of the [open agent skills ecosystem](https://agentskills.io):

- 📦 **Stacks** — Curated, shareable bundles of skills. Install with one command.
- ⚡ **Bench** — Automated quality scoring. Find out which skills actually help and which are broken.
- 🔀 **Sync** — Cross-agent audit. Find mismatches across Claude Code, Cursor, Codex, and more.

It works with every agent that supports the SKILL.md standard — Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf, Kiro, OpenCode, Roo, Amp, and 50+ others.

## Why?

Thousands of agent skills exist. Three problems:

| Problem | Solution |
|---|---|
| Installing 8 skills takes 8 commands | `skillrank install user/stack` |
| No way to know if a skill actually works | `skillrank bench` |
| Skills installed in Claude Code but not Cursor | `skillrank sync` |

## Install

```bash
npm install -g skillrank
```

Or run without installing:

```bash
npx skillrank <command>
```

## Quick tour

### See what you have

```bash
skillrank list --agents
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
skillrank install darcy2002/nextjs-starter
```

Fetches `skillrank.yaml` from GitHub and installs every skill in the bundle.

### Benchmark your skills

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
skillrank bench
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
skillrank sync --dry-run
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
skillrank create     # interactive wizard
skillrank publish    # push to GitHub
```

Anyone can then install with `skillrank install your-username/your-stack`.

## All commands

| Command | What it does |
|---|---|
| `skillrank install <stack>` | Install a stack from GitHub |
| `skillrank bench` | Score installed skills 0-100 |
| `skillrank sync` | Audit and reconcile across agents |
| `skillrank create` | Interactive stack builder |
| `skillrank publish` | Push your stack to GitHub |
| `skillrank list` | Show detected agents + skills |
| `skillrank score <skill>` | Quick bench of one skill |

See the [full documentation](https://docs.skillrank.dev) for every flag and option.

## How bench works

```
1. Scan installed SKILL.md files
2. Use Claude API to generate test prompts per skill
3. Run each prompt twice — with skill, without skill
4. Send both outputs to Claude as a blind judge
5. Score 0-100 and compute delta
```

Cost: roughly **$0.02 per skill**. Benchmarking 10 skills ≈ $0.20.

See [How Bench Works](https://docs.skillrank.dev/bench/how-it-works) for the full methodology.

## Built on `npx skills`

skillrank doesn't reimplement skill installation — we shell out to [`npx skills`](https://www.npmjs.com/package/skills) by Vercel for that. We focus on the three layers nobody else has built: **quality scoring, bundling, and cross-agent sync.**

## Requirements

- Node.js 20+
- At least one coding agent with skill support
- Anthropic API key (only for `bench` and `score` commands)

## Documentation

Full docs at **[docs.skillrank.dev](https://docs.skillrank.dev)**:

- [Quickstart](https://docs.skillrank.dev/quickstart)
- [Command reference](https://docs.skillrank.dev/commands/install)
- [skillrank.yaml schema](https://docs.skillrank.dev/stacks/yaml-reference)
- [How bench works](https://docs.skillrank.dev/bench/how-it-works)
- [CI/CD integration](https://docs.skillrank.dev/guides/ci-integration)

## Contributing

Found a bug? [Open an issue](https://github.com/darcy2002/SkillRank/issues).

Want to contribute? PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [darcy2002](https://github.com/darcy2002)
