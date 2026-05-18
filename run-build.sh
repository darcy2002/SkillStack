#!/bin/bash

# ═══════════════════════════════════════════════════════════
# skillstack — Automated Build Runner
# ═══════════════════════════════════════════════════════════
# Runs build prompts 2-8 via Claude Code's -p (headless) mode.
# Each prompt runs in its own session, commits, and pushes.
#
# Usage:
#   chmod +x run-build.sh
#   ./run-build.sh              # Run all remaining prompts
#   ./run-build.sh 3            # Start from prompt 3
#   ./run-build.sh 3 5          # Run prompts 3 through 5
#
# Prerequisites:
#   - Claude Code CLI installed and authenticated (claude --version)
#   - Git repo initialized with remote set (git remote -v)
#   - Run from the skillstack project root
#
# Safety:
#   - Uses --allowedTools instead of --dangerously-skip-permissions
#   - Sets --max-turns 50 per prompt (prevents infinite loops)
#   - Stops on failure (won't run next prompt if current one breaks)
#   - Logs everything to ./build-logs/
# ═══════════════════════════════════════════════════════════

set -e  # Exit on any error

# ── Config ────────────────────────────────────────────────
START=${1:-2}          # First prompt to run (default: 2)
END=${2:-8}            # Last prompt to run (default: 8)
MAX_TURNS=50           # Max agent turns per prompt
LOG_DIR="./build-logs"
REMOTE_BRANCH="main"

# ── Setup ─────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

echo ""
echo "⚡ skillstack automated build"
echo "═══════════════════════════════════════════"
echo "  Prompts:    $START → $END"
echo "  Max turns:  $MAX_TURNS per prompt"
echo "  Logs:       $LOG_DIR/"
echo "  Started:    $(date)"
echo "═══════════════════════════════════════════"
echo ""

# ── Preflight checks ─────────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo "❌ Claude Code CLI not found. Install it first."
  exit 1
fi

if ! git remote -v | grep -q origin; then
  echo "❌ No git remote 'origin' set. Run: git remote add origin <your-repo-url>"
  exit 1
fi

if [ ! -f "CLAUDE.md" ]; then
  echo "❌ Not in skillstack project root (CLAUDE.md not found)"
  exit 1
fi

if [ ! -d "prompts" ]; then
  echo "📁 Creating prompts/ directory..."
  mkdir -p prompts
  echo "❌ Prompt files not found. Run this script after creating prompts/02.md through prompts/08.md"
  echo "   (See below for how to create them)"
  exit 1
fi

# ── Run prompts ───────────────────────────────────────────
for i in $(seq "$START" "$END"); do
  PROMPT_FILE="prompts/$(printf '%02d' $i).md"
  LOG_FILE="$LOG_DIR/prompt-$(printf '%02d' $i).log"
  
  if [ ! -f "$PROMPT_FILE" ]; then
    echo "⚠️  Skipping prompt $i — $PROMPT_FILE not found"
    continue
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ Running Prompt $i / $END"
  echo "  File: $PROMPT_FILE"
  echo "  Time: $(date '+%H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Read prompt content
  PROMPT_CONTENT=$(cat "$PROMPT_FILE")

  # Run claude in headless mode
  claude -p "$PROMPT_CONTENT" \
    --allowedTools "Bash,Read,Write,Edit" \
    --permission-mode acceptEdits \
    --max-turns "$MAX_TURNS" \
    2>&1 | tee "$LOG_FILE"

  EXIT_CODE=${PIPESTATUS[0]}

  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Prompt $i failed (exit code: $EXIT_CODE)"
    echo "   Check log: $LOG_FILE"
    echo "   Fix the issue, then resume with: ./run-build.sh $i"
    exit 1
  fi

  # Push to GitHub
  if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  No changes to push for prompt $i"
  else
    # If claude didn't commit, do it ourselves
    if [ -n "$(git status --porcelain)" ]; then
      git add -A
      git commit -m "feat: prompt $i auto-commit"
    fi
    git push origin "$REMOTE_BRANCH"
    echo "✅ Prompt $i complete — pushed to origin/$REMOTE_BRANCH"
  fi

  echo ""
done

# ── Done ──────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "✅ All prompts complete!"
echo "   Finished: $(date)"
echo "   Logs: $LOG_DIR/"
echo "═══════════════════════════════════════════"
