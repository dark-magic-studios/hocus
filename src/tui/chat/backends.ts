export interface Backend {
  id: string;
  label: string;
  command: string;
  args: (prompt: string) => string[];
}

// One-shot "print mode" invocations — each of these CLIs takes a prompt and
// returns a final answer on stdout instead of opening an interactive
// session. Cycled with ctrl+b in the seance tab.
export const BACKENDS: Backend[] = [
  { id: 'claude', label: 'Claude Code', command: 'claude', args: (prompt) => ['-p', prompt] },
  { id: 'opencode', label: 'OpenCode', command: 'opencode', args: (prompt) => ['-p', prompt] },
  { id: 'agy', label: 'Antigravity', command: 'agy', args: (prompt) => ['-p', prompt] },
];
