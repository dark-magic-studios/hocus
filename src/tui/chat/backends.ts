export interface Backend {
  id: string;
  label: string;
  provider: string;
  /** Model passed to the CLI, or 'default' when the CLI picks its own. */
  model: string;
  command: string;
  args: (prompt: string) => string[];
}

// One-shot "print mode" invocations — each of these CLIs takes a prompt and
// returns a final answer on stdout instead of opening an interactive
// session. Cycled with ctrl+b in the seance tab. Model flags are only passed
// where the CLI's --help documents them: `claude --model <alias>`,
// `agy --model <id>`, `copilot --model <id>`. opencode's models are
// provider-configured per user, so it runs with its own default.
export const BACKENDS: Backend[] = [
  {
    id: 'claude-sonnet',
    label: 'claude + sonnet',
    provider: 'claude',
    model: 'sonnet',
    command: 'claude',
    args: (prompt) => ['--model', 'sonnet', '-p', prompt],
  },
  {
    id: 'claude-opus',
    label: 'claude + opus',
    provider: 'claude',
    model: 'opus',
    command: 'claude',
    args: (prompt) => ['--model', 'opus', '-p', prompt],
  },
  {
    id: 'claude-haiku',
    label: 'claude + haiku',
    provider: 'claude',
    model: 'haiku',
    command: 'claude',
    args: (prompt) => ['--model', 'haiku', '-p', prompt],
  },
  {
    id: 'opencode',
    label: 'opencode (default model)',
    provider: 'opencode',
    model: 'default',
    command: 'opencode',
    args: (prompt) => ['run', prompt],
  },
  {
    id: 'agy-gemini-3.1-pro',
    label: 'agy + Gemini 3.1 Pro',
    provider: 'agy',
    model: 'gemini-3.1-pro-high',
    command: 'agy',
    args: (prompt) => ['--model', 'gemini-3.1-pro-high', '-p', prompt],
  },
  {
    id: 'agy-gemini-3.6-flash',
    label: 'agy + Gemini 3.6 Flash',
    provider: 'agy',
    model: 'gemini-3.6-flash-medium',
    command: 'agy',
    args: (prompt) => ['--model', 'gemini-3.6-flash-medium', '-p', prompt],
  },
  {
    id: 'copilot-gpt-5.4',
    label: 'copilot + GPT-5.4',
    provider: 'copilot',
    model: 'gpt-5.4',
    command: 'copilot',
    args: (prompt) => ['--model', 'gpt-5.4', '-p', prompt, '-s'],
  },
];
