import { banner } from '../utils/ui.js';

interface ScoreOptions {
  model: string;
}

export async function scoreCommand(
  skill: string,
  options: ScoreOptions
): Promise<void> {
  banner();

  // TODO: Quick bench for a single skill
  // Same as bench but for one skill only
  // 1. Find the skill by name across all agents
  // 2. Run C2-C4 pipeline on just that skill
  // 3. Output mini scorecard

  console.log(`  🚧 Score for "${skill}" not yet implemented. Coming in Phase 5.`);
}
