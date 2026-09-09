import { runCast } from '../../commands/cast.js';
import { runSync } from '../../commands/sync.js';
import { runUpgrade } from '../../commands/upgrade.js';
import { getHocusStatus, type HocusStatus } from '../../utils/status.js';

export async function runExpressUpdate(repoRoot: string, status: HocusStatus): Promise<string> {
  if (!status.installed) {
    return 'not installed — run `hocus init` first';
  }

  const steps: string[] = [];

  await runUpgrade({ repoRoot, personas: true, skills: true });
  steps.push('upgraded');

  let current = await getHocusStatus(repoRoot);
  if (current.statusMessage.includes('dashboard')) {
    await runSync({ repoRoot });
    steps.push('synced');
    current = await getHocusStatus(repoRoot);
  }

  if (current.statusMessage.includes('uncompiled')) {
    await runCast({ repoRoot });
    steps.push('cast');
  }

  const final = await getHocusStatus(repoRoot);
  if (final.isUpToDate) {
    return `express update complete (${steps.join(' → ')})`;
  }
  return `${steps.join(' → ')} — ${final.statusMessage}`;
}
