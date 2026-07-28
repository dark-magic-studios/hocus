import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';

export interface BackendResult {
  ok: boolean;
  output: string;
}

export interface RunHandle {
  result: Promise<BackendResult>;
  cancel: () => void;
}

export type SpawnFn = typeof nodeSpawn;

function describeSpawnError(command: string, err: unknown): string {
  const code = (err as NodeJS.ErrnoException)?.code;
  if (code === 'ENOENT') {
    return `"${command}" not found on PATH — install it or cycle to another backend (ctrl+b).`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Runs one backend CLI as a one-shot child process. `spawnFn` is injectable
 * so tests can exercise the full submit/cancel flow without touching a real
 * binary.
 */
export function runBackend(
  command: string,
  args: string[],
  cwd: string,
  spawnFn: SpawnFn = nodeSpawn,
): RunHandle {
  let child: ChildProcess | undefined;
  let cancelled = false;

  const result = new Promise<BackendResult>((resolve) => {
    let settled = false;
    const settle = (r: BackendResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    try {
      child = spawnFn(command, args, { cwd });
    } catch (e) {
      settle({ ok: false, output: describeSpawnError(command, e) });
      return;
    }

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('error', (err: NodeJS.ErrnoException) => {
      settle({ ok: false, output: describeSpawnError(command, err) });
    });

    child.on('close', (code) => {
      if (cancelled) {
        settle({ ok: false, output: 'cancelled' });
        return;
      }
      if (code === 0) {
        settle({ ok: true, output: stdout.trim() || '(no output)' });
      } else {
        settle({ ok: false, output: (stderr || stdout).trim() || `exited with code ${code}` });
      }
    });
  });

  return {
    result,
    cancel: () => {
      cancelled = true;
      child?.kill('SIGTERM');
    },
  };
}
