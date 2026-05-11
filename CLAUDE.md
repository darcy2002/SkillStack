# skillstack

Curated, tested, shareable agent skill bundles for the open agent skills ecosystem.

## What this is

A CLI tool (`npx skillstack`) that adds three layers on top of the existing `npx skills` ecosystem (by Vercel):

1. **Stacks** — Curated bundles of skills defined in a `skillstack.yaml`. One command installs the whole bundle.
2. **Bench** — Automated quality scoring. Runs each skill against synthetic tasks via Claude API (with vs without the skill), grades outputs, reports scores.
3. **Sync** — Cross-agent audit. Shows what skills are installed where, finds mismatches, reconciles.

We do NOT reimplement install/remove — we shell out to `npx skills add/remove` for that (it supports 51+ agents).

## Architecture

### Layer A: CLI (src/cli.ts)
Commands: `install`, `bench`, `sync`, `create`, `publish`, `list`, `score`
Framework: commander.js

### Layer B: Stack engine (src/stack/)
- `parser.ts` — Parse + validate skillstack.yaml ✅ DONE
- `resolver.ts` — Convert skill entries into `npx skills add` commands ⚠️ PARTIAL
- `lock.ts` — Read/write skillstack-lock.json (TODO)

### Layer C: Bench engine (src/bench/) — CORE IP, TODO
- `scanner.ts` — Read all SKILL.md files from detected agent directories
- `task-generator.ts` — Claude API generates 3 test prompts per skill from its description
- `runner.ts` — Dual execution: run each prompt with skill in system prompt vs without
- `grader.ts` — Claude API judges both outputs blind, returns 0-100 scores
- `conflicts.ts` — Compare description keywords across skills, flag >40% overlap
- `reporter.ts` — Render terminal scorecard table + write bench-report.json and .md

### Layer D: Agent adapter (src/agents/)
- `paths.ts` — Agent path constants (10 agents defined) ✅ DONE
- `detector.ts` — Filesystem scan to detect installed agents ✅ DONE
- `converter.ts` — SKILL.md → .mdc (Cursor) / .md (Windsurf) ✅ DONE

### Layer E: Sync engine (src/sync/) — TODO
- `scanner.ts` — Cross-agent skill inventory (Map<skillName, Map<agentName, {version, hash}>>)
- `differ.ts` — Build diff matrix: present / missing / outdated per agent
- `reconciler.ts` — Interactive: user picks what to sync, copies/converts files

### Layer F: Utilities (src/utils/)
- `skillmd.ts` — Shared SKILL.md parser (gray-matter) ✅ DONE
- `ui.ts` — Chalk formatting, spinners, tables ✅ DONE
- `config.ts` — ~/.skillstack/config.json (API key, prefs) ✅ DONE
- `github.ts` — Fetch skillstack.yaml from GitHub repos ✅ DONE

## Build order

Phase 1: ✅ Foundation (paths, detector, converter, skillmd, ui, config, github)
Phase 2: ⚠️ Stack engine (parser done, resolver partial, lock TODO)
Phase 3: 🔴 Bench engine (all 6 modules)
Phase 4: 🔴 Sync engine (all 3 modules)
Phase 5: 🔴 Commands wiring (install, bench, sync, create, publish, list, score)
Phase 6: 🔴 Tests, README, demo GIF, npm publish

## Key design decisions

- Shell out to `npx skills add/remove` — don't reimplement install logic
- Claude API key required ONLY for bench — install/sync/create/list work without it
- Stacks are just GitHub repos with a skillstack.yaml — zero infrastructure
- Bench uses claude-sonnet-4-20250514 by default (fast + cheap, ~$0.02/skill)
- bench-report.md is designed to be screenshot-friendly for viral sharing

## Tech stack

- Node.js + TypeScript (ESM)
- commander.js (CLI), chalk (colors), ora (spinners), cli-table3 (tables)
- gray-matter (SKILL.md parsing), yaml (skillstack.yaml parsing)
- @anthropic-ai/sdk (bench engine)
- enquirer (interactive prompts)
- esbuild (build), vitest (test)

## Agent skills format

Skills follow the open standard at agentskills.io:
- A folder with a SKILL.md file (YAML frontmatter + markdown body)
- Frontmatter: `name` (required), `description` (required), optional metadata
- Optional: scripts/, references/, assets/ subdirectories
- Progressive disclosure: metadata loaded first (~100 tokens), full body on demand

## Supported agents (src/agents/paths.ts)

Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Kiro, OpenCode, Roo, Amp

## The viral angle

The bench command is the growth engine. The tweet:
> "I just ran `npx skillstack bench` on my 12 installed skills. 3 broken, 2 conflicting, best one scores 92/100."
> [screenshot of terminal scorecard]

The skillstack.yaml sharing is the network effect. "Show me your skillstack" becomes a meme.
