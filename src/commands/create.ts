import { banner } from '../utils/ui.js';

interface CreateOptions {
  name?: string;
  output: string;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  banner();

  // TODO: Interactive prompts to build skillstack.yaml
  // 1. Ask for stack name, author, description
  // 2. Detect installed skills, let user pick
  // 3. Detect agents, let user pick targets
  // 4. Write skillstack.yaml to output path

  console.log('  🚧 Create wizard not yet implemented. Coming in Phase 5.');
}
