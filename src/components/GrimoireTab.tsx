import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';

const SOURCE_COLOR: Record<string, string> = {
  bundled: palette.green,
  local: palette.muted,
  pack: palette.violet,
};

// TODO(DMS): space toggles a skill for the selected agent, `i` installs a pack.
// Skills are mirrored (SKILL.md is already a shared standard), never compiled.
export function GrimoireTab() {
  const { data } = useDeck();

  if (data.skills.length === 0) {
    return <Text color={palette.dim}>grimoire is empty. `hocus skill add &lt;name&gt;` to mirror one in.</Text>;
  }

  return (
    <Box flexDirection="column">
      {data.skills.map((s) => (
        <Box key={s.id} flexDirection="column">
          <Text>
            <Text color={SOURCE_COLOR[s.source] ?? palette.muted}>{`[${s.source}]`.padEnd(11)}</Text>
            <Text color={palette.text}>{s.name.padEnd(24)}</Text>
            <Text color={palette.dim}>{`${s.enabledFor.length} bound`}</Text>
          </Text>
          <Text color={palette.muted}>{`             ${s.description}`}</Text>
        </Box>
      ))}
    </Box>
  );
}
