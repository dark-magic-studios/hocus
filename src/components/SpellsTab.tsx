import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { StatusDot } from '../components/StatusDot.js';

// TODO(DMS): ↑↓ selection, ⏎ opens the spell markdown, `a` assigns an agent.
export function SpellsTab() {
  const { data } = useDeck();

  if (data.spells.length === 0) {
    return <Text color={palette.dim}>no spells in _spells/. run `hocus draft` to write the first one.</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {data.spells.map((s) => (
        <Box key={s.id} flexDirection="column">
          <Text>
            <StatusDot status={s.status === 'casting' ? 'active' : s.status === 'blocked' ? 'blocked' : 'idle'} />
            <Text bold color={palette.violet}>{` ${s.name}`}</Text>
            <Text color={palette.dim}>{`  ${s.aka}`}</Text>
          </Text>
          <Text color={palette.muted}>
            {`  drafted ${s.draftedBy}${s.assignedTo ? ` · assigned ${s.assignedTo}` : ''}${s.reviewedBy ? ` · review ${s.reviewedBy}` : ''}`}
          </Text>
          {s.note ? <Text color={palette.amber}>{`  ${s.note}`}</Text> : null}
          <Box marginLeft={2}><ProgressBar value={s.progress} /></Box>
        </Box>
      ))}
    </Box>
  );
}
