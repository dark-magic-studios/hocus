export interface Backend {
  id: string;
  label: string;
  provider: string;
  model: string;
  command: string;
  args: (prompt: string) => string[];
}

// One-shot "print mode" invocations — each of these CLIs takes a prompt and
// returns a final answer on stdout instead of opening an interactive
// session. Cycled with ctrl+b in the seance tab.
export const BACKENDS: Backend[] = [
  {
    id: 'claude-sonnet-5',
    label: 'claude + Sonnet 5',
    provider: 'claude',
    model: 'Sonnet 5',
    command: 'claude',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'claude-opus-5',
    label: 'claude + Opus 5',
    provider: 'claude',
    model: 'Opus 5',
    command: 'claude',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'claude-haiku-3.5',
    label: 'claude + Haiku 3.5',
    provider: 'claude',
    model: 'Haiku 3.5',
    command: 'claude',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'opencode-deepseek',
    label: 'opencode + DeepSeek',
    provider: 'opencode',
    model: 'DeepSeek',
    command: 'opencode',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'opencode-sonnet',
    label: 'opencode + Claude Sonnet',
    provider: 'opencode',
    model: 'Claude Sonnet',
    command: 'opencode',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'agy-gemini-2.5-pro',
    label: 'agy + Gemini 2.5 Pro',
    provider: 'agy',
    model: 'Gemini 2.5 Pro',
    command: 'agy',
    args: (prompt) => ['-p', prompt],
  },
  {
    id: 'agy-gemini-3.6-flash',
    label: 'agy + Gemini 3.6 Flash',
    provider: 'agy',
    model: 'Gemini 3.6 Flash',
    command: 'agy',
    args: (prompt) => ['-p', prompt],
  },
];
