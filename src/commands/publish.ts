import { banner } from '../utils/ui.js';

interface PublishOptions {
  private?: boolean;
}

export async function publishCommand(options: PublishOptions): Promise<void> {
  banner();

  // TODO: Push stack to GitHub
  // 1. Check skillstack.yaml exists
  // 2. git init if needed
  // 3. Create GitHub repo via API (or prompt user)
  // 4. git add + commit + push

  console.log('  🚧 Publish not yet implemented. Coming in Phase 5.');
}
