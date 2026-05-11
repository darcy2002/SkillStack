import { banner, status, error } from '../utils/ui.js';
import { buildMatrix } from '../sync/scanner.js';
import { computeDiff } from '../sync/differ.js';
import { showDiffTable, reconcile } from '../sync/reconciler.js';

interface SyncOptions {
  dryRun?: boolean;
  agent?: string[];
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  banner();

  const { matrix, agents, allSkills } = buildMatrix();
  if (agents.length === 0) {
    error('No coding agents detected on this machine.');
    return;
  }

  const targetAgents = options.agent && options.agent.length > 0
    ? agents.filter((a) => options.agent!.includes(a))
    : agents;

  if (allSkills.length === 0) {
    status.warn('No installed skills found across any agent.');
    return;
  }

  const diff = computeDiff(matrix, targetAgents);
  showDiffTable(diff, targetAgents);

  if (!options.dryRun) {
    await reconcile(diff, matrix, targetAgents, false);
  } else {
    status.info('Dry run — no changes made.');
  }
}
