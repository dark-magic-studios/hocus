import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';

// TODO(DMS): master/detail — list left, SOUL.md frontmatter form right.
// Edits validate against the zod schema before write; `w` writes, `r` recompiles.
export function SoulsTab() {
  const { data } = useDeck();

  if (data.agents.length === 0) {
    return <Text color={palette.dim}>no souls bound. run `hocus cast` to compile the bundled cast.</Text>;
  }

  return (
    <Box flexDirection="column">
      {data.agents.map((a) => (
        <Text key={a.id}>
          <Text color={palette.green}>{a.glyph.padEnd(5)}</Text>
          <Text color={palette.text}>{a.name.padEnd(22)}</Text>
          <Text color={palette.dim}>{a.soulPath}</Text>
        </Text>
      ))}
    </Box>
  );
}
