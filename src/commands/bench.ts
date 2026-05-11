import { error, banner } from '../utils/ui.js';
import { getApiKey } from '../utils/config.js';

interface BenchOptions {
  stack?: string;
  model: string;
  tasks: string;
  json?: boolean;
  md?: boolean;
}

export async function benchCommand(options: BenchOptions): Promise<void> {
  banner();

  // Check API key
  const apiKey = getApiKey();
  if (!apiKey) {
    error(
      'Bench requires a Claude API key.\n' +
      '  Set ANTHROPIC_API_KEY env var, or run:\n' +
      '  skillstack config --api-key <your-key>'
    );
    process.exit(1);
  }

  // TODO: Implement bench pipeline
  // 1. C1: Scan installed skills (scanner.ts)
  // 2. C2: Generate test tasks per skill (task-generator.ts)
  // 3. C3: Dual execution — with/without skill (runner.ts)
  // 4. C4: Grade outputs blind (grader.ts)
  // 5. C5: Detect keyword conflicts (conflicts.ts)
  // 6. C6: Render terminal scorecard (reporter.ts)

  console.log('  🚧 Bench engine not yet implemented. Coming in Phase 3.');
}
