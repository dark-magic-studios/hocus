import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';

export function Footer({ hints }: { hints: string[] }) {
  return (
    <Box paddingX={1} gap={2}>
      {hints.map((h) => {
        const [key, ...rest] = h.split(' ');
        return (
          <Text key={h}>
            <Text color={palette.green}>{key}</Text>
            <Text color={palette.dim}>{` ${rest.join(' ')}`}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
