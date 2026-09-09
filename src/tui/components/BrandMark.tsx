import React from 'react';
import { Box, Text } from 'ink';
import { getBrandMark, palette } from '../theme.js';
import { useCapabilities } from '../hooks/useCapabilities.js';

interface BrandMarkProps {
  /** Inline header variant — violet star + green HOCUS wordmark. */
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  const { unicode } = useCapabilities();

  if (compact) {
    const star = unicode ? '✦' : '*';
    return (
      <Text>
        <Text color={palette.violet}>{star}</Text>
        <Text bold color={palette.green}> HOCUS</Text>
      </Text>
    );
  }

  const rows = getBrandMark(unicode);
  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Text
          key={i}
          color={row.color === 'violet' ? palette.violet : palette.green}
        >
          {row.text}
        </Text>
      ))}
    </Box>
  );
}
