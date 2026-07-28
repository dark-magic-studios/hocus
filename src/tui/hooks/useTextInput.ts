import { useState } from 'react';
import { useInput } from 'ink';

export interface TextInputState {
  value: string;
  reset: () => void;
}

/**
 * Minimal inline text capture for prompts (assign agent, spawn familiar,
 * edit a soul field) without pulling in ink-text-input as a new dependency.
 */
export function useTextInput(
  active: boolean,
  onSubmit: (value: string) => void,
  onCancel?: () => void,
): TextInputState {
  const [value, setValue] = useState('');

  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit(value);
        setValue('');
        return;
      }
      if (key.escape) {
        onCancel?.();
        setValue('');
        return;
      }
      if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setValue((v) => v + input);
      }
    },
    { isActive: active },
  );

  return { value, reset: () => setValue('') };
}
