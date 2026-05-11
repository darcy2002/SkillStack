# SKILLSTACK — Structured Build Prompts for Claude Code

> Copy-paste each prompt into Claude Code one at a time.  
> Each prompt is self-contained — it includes all context needed.  
> After each phase, verify the checklist before moving to the next.  
> Git commit after each phase.

---

## PROMPT 1: Finish the Stack Engine (resolver + lock)

```
Read CLAUDE.md for full project context.

I need you to complete two modules in the stack engine:

### 1. src/stack/resolver.ts

This module converts a parsed StackManifest into executable npx commands.

- Import StackManifest and SkillEntry from ./parser.ts
- Export a `ResolvedInstall` interface: { command: string, label: string, skill: SkillEntry }
- Export function `resolveStack(manifest: StackManifest): ResolvedInstall[]`
  - For each skill in manifest.skills, build the command:
    `npx skills add <source> --skill "<skill>" -a <agent1> -a <agent2> -y`
  - If manifest.agents is defined, use those. Otherwise leave out agent flags (npx skills will prompt).
  - The `label` should be human-readable: `<skill> from <source>`
- Export function `resolveOne(skill: SkillEntry, agents?: string[]): string`
  - Returns just the command string for a single skill

### 2. src/stack/lock.ts

Lock file management for reproducible stack installs.

- Lock file path: `./skillstack-lock.json` (project-local, committed to git)
- Interface `LockEntry`: { source: string, skill: string, installedAt: string, contentHash: string }
- Interface `LockFile`: { version: 1, stackName: string, entries: LockEntry[] }
- Export function `readLock(dir?: string): LockFile | null` — read and parse, return null if not found
- Export function `writeLock(lock: LockFile, dir?: string): void` — write to disk
- Export function `addToLock(lock: LockFile, entry: LockEntry): LockFile` — add/update an entry

### 3. Update src/commands/install.ts

- After each successful skill install, call addToLock to track it
- At the end, call writeLock to save the lock file
- If `skillstack install` is called with NO arguments and NO --file flag:
  - Check for skillstack-lock.json first, if found restore from lock
  - Then check for skillstack.yaml, if found install from it
  - Otherwise show error

After completing, run: git add -A && git commit -m "feat: complete stack engine (resolver + lock + install)"
```

---

## PROMPT 2: Build the Bench Scanner + Task Generator

```
Read CLAUDE.md for project context. The bench engine is our core differentiator — it scores installed agent skills by testing them with Claude API.

Build these two modules:

### 1. src/bench/scanner.ts

Scans all detected agents and collects every installed SKILL.md.

- Import detectAgents from ../agents/detector.ts
- Import parseSkillMd, ParsedSkill from ../utils/skillmd.ts
- Export function `scanAllSkills(cwd?: string): ParsedSkill[]`
  - Call detectAgents(cwd)
  - For each agent, walk each skillDir
  - Find all directories containing SKILL.md
  - Parse each with parseSkillMd
  - Deduplicate by name (same skill installed in multiple agents = one entry)
  - Return array of ParsedSkill
- Export function `scanSkillByName(name: string, cwd?: string): ParsedSkill | null`
  - Find a specific skill by name across all agents

### 2. src/bench/task-generator.ts

Uses Claude API to generate realistic test prompts for each skill.

- Import Anthropic from @anthropic-ai/sdk
- Import getApiKey from ../utils/config.ts
- Import ParsedSkill from ../utils/skillmd.ts

- Export interface `GeneratedTasks`: { skillName: string, tasks: string[] }

- Export function `generateTasks(skill: ParsedSkill, count: number, model: string): Promise<GeneratedTasks>`
  - Create Anthropic client with getApiKey()
  - System prompt:
    ```
    You are a test prompt generator. Given an agent skill's name and description,
    generate exactly {count} realistic user prompts that would trigger this skill.
    
    Rules:
    - Each prompt should be a natural request a developer would make
    - Prompts should test different aspects of the skill
    - Keep prompts concise (1-3 sentences)
    - Return ONLY a JSON array of strings, nothing else
    ```
  - User prompt: `Skill name: {skill.name}\nDescription: {skill.description}\n\nGenerate {count} test prompts.`
  - Parse the JSON response, return the tasks array
  - Handle errors gracefully — if JSON parse fails, retry once, then throw

After completing, run: git add -A && git commit -m "feat: bench scanner and task generator"
```

---

## PROMPT 3: Build the Bench Runner + Grader

```
Read CLAUDE.md for project context. We're building the dual-execution and grading pipeline for the bench engine.

### 1. src/bench/runner.ts

Runs each test prompt twice: once with the skill injected, once without.

- Import Anthropic from @anthropic-ai/sdk
- Import getApiKey from ../utils/config.ts

- Export interface `RunResult`:
  {
    prompt: string,
    withSkill: { output: string, tokens: number },
    withoutSkill: { output: string, tokens: number }
  }

- Export function `runDual(prompt: string, skillBody: string, model: string): Promise<RunResult>`
  - Create Anthropic client
  - Call 1 (WITH skill): system prompt = skill's full SKILL.md body, user prompt = the test prompt
  - Call 2 (WITHOUT skill): no system prompt, user prompt = the test prompt
  - Both calls: max_tokens = 1024, temperature = 0
  - Track input + output token usage from response.usage
  - Return both outputs

- Export function `runAllTasks(tasks: string[], skillBody: string, model: string): Promise<RunResult[]>`
  - Run runDual for each task sequentially (don't parallelize to avoid rate limits)
  - Show progress via console

### 2. src/bench/grader.ts

Uses Claude as a blind judge to score both outputs.

- Export interface `GradeResult`:
  {
    prompt: string,
    scoreWith: number,     // 0-100
    scoreWithout: number,  // 0-100
    delta: number,         // scoreWith - scoreWithout
    reasoning: string      // Brief explanation
  }

- Export function `gradeOutputs(prompt: string, outputA: string, outputB: string, model: string): Promise<{ scoreA: number, scoreB: number, reasoning: string }>`
  - IMPORTANT: Randomize which output is A vs B to prevent position bias
  - System prompt:
    ```
    You are an expert code and content quality judge. You will evaluate two outputs
    for the same prompt. Score each from 0-100 on:
    - Relevance (does it address the prompt?)
    - Quality (is it well-structured, correct, complete?)
    - Usefulness (would a developer find this helpful?)
    
    Return ONLY a JSON object: { "scoreA": number, "scoreB": number, "reasoning": "brief explanation" }
    ```
  - User prompt: `Prompt: {prompt}\n\n--- Output A ---\n{outputA}\n\n--- Output B ---\n{outputB}`
  - After getting scores, un-randomize: map scoreA/scoreB back to with/without skill

- Export function `gradeAllResults(results: RunResult[], model: string): Promise<GradeResult[]>`
  - Grade each RunResult sequentially
  - Return array of GradeResult

After completing, run: git add -A && git commit -m "feat: bench runner and grader"
```

---

## PROMPT 4: Build Conflict Detector + Reporter

```
Read CLAUDE.md for project context. Final two modules of the bench engine.

### 1. src/bench/conflicts.ts

Detects skills with overlapping trigger keywords that could confuse agent discovery.

- Import extractKeywords, ParsedSkill from ../utils/skillmd.ts

- Export interface `Conflict`:
  {
    skillA: string,
    skillB: string,
    overlapKeywords: string[],
    overlapPercent: number  // 0-100
  }

- Export function `detectConflicts(skills: ParsedSkill[], threshold: number = 40): Conflict[]`
  - For each pair of skills:
    - Extract keywords from both descriptions using extractKeywords()
    - Find intersection
    - Calculate overlap as: (intersection.length / Math.min(keywordsA.length, keywordsB.length)) * 100
    - If overlapPercent >= threshold, add to conflicts
  - Sort by overlapPercent descending
  - Return conflicts array

### 2. src/bench/reporter.ts

Renders the terminal scorecard and writes bench-report.json + bench-report.md.

- Import chalk from chalk, createTable from ../utils/ui.ts
- Import scoreColor, deltaColor, statusBadge from ../utils/ui.ts

- Export interface `BenchReport`:
  {
    timestamp: string,
    model: string,
    skills: Array<{
      name: string,
      score: number,
      delta: number,
      status: 'strong' | 'weak' | 'broken',
      tasks: Array<{ prompt: string, scoreWith: number, scoreWithout: number }>
    }>,
    conflicts: Conflict[],
    totalTokens: number,
    estimatedCost: string
  }

- Export function `renderTerminal(report: BenchReport): void`
  - Create a table with columns: Skill, Score, Δ vs raw, Status
  - Use scoreColor, deltaColor, statusBadge for coloring
  - Below the table, show conflicts section if any:
    "⚠ Conflicts detected:"
    "  → skillA & skillB both trigger on: keyword1, keyword2"
  - Show footer: total tokens, estimated cost

- Export function `writeJsonReport(report: BenchReport, path?: string): void`
  - Write bench-report.json to disk

- Export function `writeMarkdownReport(report: BenchReport, path?: string): void`
  - Write bench-report.md — designed to look great as a screenshot
  - Use a markdown table with emoji status indicators
  - Include a header: "# ⚡ skillstack bench report"
  - This is the viral artifact — make it look clean and shareable

### 3. Wire it all up in src/commands/bench.ts

Replace the stub with the full pipeline:
1. Check API key (already done)
2. Call scanAllSkills() from scanner.ts
3. For each skill: generateTasks() → runAllTasks() → gradeAllResults()
4. Call detectConflicts() on all skills
5. Build BenchReport object, calculate totalTokens and estimatedCost
6. Call renderTerminal()
7. If --json flag: writeJsonReport()
8. If --md flag: writeMarkdownReport()

Show progress with ora spinners throughout. Use these labels:
- "Scanning installed skills..."
- "Generating test tasks for {skill.name}..."
- "Running benchmarks for {skill.name}..."
- "Grading outputs for {skill.name}..."
- "Checking for conflicts..."

After completing, run: git add -A && git commit -m "feat: complete bench engine with conflict detection and reporting"
```

---

## PROMPT 5: Build the Sync Engine

```
Read CLAUDE.md for project context. The sync engine audits skills across all detected agents and helps reconcile mismatches.

### 1. src/sync/scanner.ts

Builds a cross-agent inventory of all installed skills.

- Import detectAgents, DetectedAgent from ../agents/detector.ts
- Import parseSkillMd, ParsedSkill from ../utils/skillmd.ts

- Export interface `SkillInventoryEntry`:
  { skill: ParsedSkill, agent: string, dir: string }

- Export interface `SkillMatrix`:
  Map<string, Map<string, { hash: string, path: string }>>
  // skillName → agentName → { contentHash, filePath }

- Export function `buildMatrix(cwd?: string): { matrix: SkillMatrix, agents: string[], allSkills: string[] }`
  - Detect agents
  - Walk each agent's skill directories
  - Parse every SKILL.md found
  - Build the matrix map
  - Return matrix + list of agent names + list of all skill names

### 2. src/sync/differ.ts

Computes the diff from the matrix.

- Export type `SkillStatus` = 'synced' | 'missing' | 'outdated' | 'only-here'

- Export interface `DiffEntry`:
  {
    skillName: string,
    statuses: Map<string, SkillStatus>,  // agentName → status
    latestHash: string,  // the most common hash (assumed "correct")
    sourceAgent: string  // which agent has the latest version
  }

- Export function `computeDiff(matrix: SkillMatrix, agents: string[]): DiffEntry[]`
  - For each skill in the matrix:
    - Find which agents have it and which don't
    - For agents that have it: compare content hashes
    - The most common hash = "latest" (or the one from the most authoritative agent: claude-code > codex > cursor)
    - Mark each agent: 'synced' (same hash), 'outdated' (different hash), 'missing' (not present)
    - If skill exists in only one agent: mark others as 'missing', that agent as 'only-here'
  - Return array of DiffEntry sorted by number of issues

### 3. src/sync/reconciler.ts

Interactive reconciliation — shows diff table, user picks actions.

- Import enquirer (Prompt from enquirer)
- Import convertForAgent from ../agents/converter.ts
- Import copyFileSync, mkdirSync from fs

- Export function `showDiffTable(diff: DiffEntry[], agents: string[]): void`
  - Render a table: Skill | Agent1 | Agent2 | Agent3 | Status
  - Use chalk colors: green ✔ for synced, yellow ⚠ for outdated, red ✖ for missing

- Export function `reconcile(diff: DiffEntry[], matrix: SkillMatrix, agents: string[], dryRun: boolean): Promise<void>`
  - Filter to entries that have issues (not all synced)
  - If none: print "All skills are in sync across all agents! ✔"
  - Otherwise: show diff table
  - If dryRun: stop here
  - Prompt user: "Sync all X skills?" or let them pick individually
  - For each skill to sync:
    - Read the SKILL.md from the sourceAgent's path
    - For each target agent that's missing/outdated:
      - Check agent format (from paths.ts)
      - If 'skillmd': copy the SKILL.md file + directory
      - If 'mdc' or 'md-rule': use convertForAgent() then write
    - Print status for each operation

### 4. Wire it up in src/commands/sync.ts

Replace the stub:
1. Call buildMatrix()
2. Call computeDiff()
3. Call showDiffTable()
4. If not --dry-run: call reconcile()

After completing, run: git add -A && git commit -m "feat: complete sync engine with cross-agent reconciliation"
```

---

## PROMPT 6: Build Create + Publish + Score Commands

```
Read CLAUDE.md for project context. Final commands to make the CLI complete.

### 1. src/commands/create.ts — Interactive stack builder

Replace the stub:
- Use enquirer for all prompts
- Flow:
  1. Ask for stack name (default: directory name)
  2. Ask for author (default: git config user.name or "anonymous")
  3. Ask for description
  4. Call detectAgents() — show detected agents, let user pick which to target
  5. Call scanAllSkills() from bench/scanner.ts — show installed skills, let user multi-select
  6. Ask if they want to add skills from GitHub repos (allow entering owner/repo + skill name)
  7. Write skillstack.yaml to the --output path
  8. Print success message with next steps: "Run `skillstack install` to install this stack"

### 2. src/commands/publish.ts — Push to GitHub

Replace the stub:
- Check that skillstack.yaml exists in cwd
- Parse and validate it
- Check if git repo exists, if not: git init
- Check if remote exists, if not:
  - Prompt for GitHub username
  - Tell user to create the repo on GitHub: "Create a repo named '{stack-name}' on GitHub, then press Enter"
  - Add remote: git remote add origin https://github.com/{user}/{stack-name}.git
- git add skillstack.yaml skillstack-lock.json (if exists) README.md (if exists)
- git commit -m "feat: publish {stack-name} stack"
- git push -u origin main
- Print: "Published! Others can install with: npx skillstack install {user}/{stack-name}"

### 3. src/commands/score.ts — Quick single-skill bench

Replace the stub:
- Use scanSkillByName() to find the skill
- If not found: error message listing available skills
- Run the bench pipeline on just that one skill:
  - generateTasks (3 tasks)
  - runAllTasks
  - gradeAllResults
- Render a mini scorecard (just one row)
- Show total tokens and cost

After completing, run: git add -A && git commit -m "feat: create, publish, and score commands"
```

---

## PROMPT 7: Tests + README + Polish

```
Read CLAUDE.md for project context. Final phase — testing, documentation, and polish.

### 1. Tests (use vitest)

Create these test files:

- test/parser.test.ts
  - Test valid skillstack.yaml parsing
  - Test validation errors (missing name, empty skills, etc.)
  - Test edge cases (no agents field, no bench field)

- test/detector.test.ts
  - Mock the filesystem (use vitest vi.mock for fs)
  - Test that each agent is detected when its directory exists
  - Test that no agents are detected on a clean system
  - Test skill counting

- test/skillmd.test.ts
  - Test parseSkillMd with a sample SKILL.md
  - Test extractKeywords (stop word removal, deduplication)
  - Test toSkillMd roundtrip

- test/conflicts.test.ts
  - Test with two skills that have high keyword overlap
  - Test with two skills that have zero overlap
  - Test threshold parameter

- test/resolver.test.ts
  - Test resolveStack builds correct npx commands
  - Test with agents specified vs not specified

### 2. README.md

Write a compelling README with:
- One-line description
- Demo GIF placeholder: `![demo](./assets/demo.gif)` 
- "Why?" section — the problem (skill sprawl, no quality signals, agent fragmentation)
- "What?" section — stacks + bench + sync in 3 bullets
- Quick start: npm install, npx skillstack install, npx skillstack bench
- Full command reference with examples for each command
- Example skillstack.yaml
- Example bench output (the terminal scorecard as a code block)
- Example sync diff output
- "How bench works" section (the 5-step pipeline diagram as text)
- Cost section: "Benchmarking 10 skills costs ~$0.15"
- Contributing section
- License: MIT

Make the README optimized for GitHub stars — strong hook, clear value prop, copy-pasteable examples.

### 3. Polish

- Ensure all TypeScript compiles: run `npx tsc --noEmit` and fix any errors
- Make sure bin/skillstack.js works as entry point
- Add a `skillstack --help` screenshot section to README
- Add MIT LICENSE file

After completing, run: git add -A && git commit -m "feat: tests, README, and polish — ready for launch"
```

---

## PROMPT 8: Pre-launch Checklist

```
Read CLAUDE.md for project context. Final verification before npm publish.

Run these checks and fix any issues:

1. `npm install` — verify all deps install cleanly
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm run build` — esbuild bundles successfully
4. `npm test` — all tests pass
5. `node bin/skillstack.js --help` — shows all commands
6. `node bin/skillstack.js list` — runs without error (may show 0 agents)
7. `node bin/skillstack.js bench` — shows API key error (expected)

Fix any issues found. Then:

- Update package.json: set author, repository URL, homepage
- Verify .gitignore covers dist/, node_modules/, .env
- Verify package.json "files" array only includes what npm needs
- Run `npm pack --dry-run` to check what would be published

Final commit: git add -A && git commit -m "chore: pre-launch checks passed"
```

---

## POST-BUILD: Launch Checklist

After all 8 prompts are done, do these manually:

1. **Create GitHub repo**: `gh repo create skillstack --public`
2. **Push**: `git remote add origin <url> && git push -u origin main`
3. **npm publish**: `npm publish`
4. **Create 3-4 starter stacks** as separate repos:
   - `skillstack-nextjs` — frontend-design, react-best-practices, etc.
   - `skillstack-python` — python backend skills
   - `skillstack-devops` — CI/CD, Docker, deployment skills
5. **Record demo**: Use asciinema or screen record of `skillstack install`, `bench`, `sync`
6. **Tweet**: The bench scorecard screenshot + "I just ran npx skillstack bench on my 12 installed skills..."
7. **Post on**: r/ClaudeAI, r/ChatGPTCoding, Hacker News, Dev.to
