import React from 'react';
import { Text } from 'ink';
import { palette } from '../theme.js';
import { useCapabilities } from '../hooks/useCapabilities.js';

export function ProgressBar({ value, width = 24 }: { value: number; width?: number }) {
  const { glyph } = useCapabilities();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const filled = Math.round((pct / 100) * width);
  return (
    <Text>
      <Text color={palette.green}>{glyph.barFull.repeat(filled)}</Text>
      <Text color={palette.dim}>{glyph.barEmpty.repeat(width - filled)}</Text>
      <Text color={palette.muted}>{` ${pct}%`}</Text>
    </Text>
  );
}
