import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';

const TYPE_COLORS: Record<string, string> = {
  incantation: palette.violet,
  ward: palette.green,
  curse: palette.amber,
};

const TYPE_BADGES: Record<string, string> = {
  incantation: 'incantation',
  ward: 'ward',
  curse: 'curse',
};

export function SpellsTab() {
  const { data } = useDeck();
  const [selectedId, setSelectedId] = useState<string | undefined>(data.spells[0]?.id);
  const [expanded, setExpanded] = useState(false);

  const move = (delta: number) => {
    if (data.spells.length === 0) return;
    const idx = Math.max(0, data.spells.findIndex((s) => s.id === selectedId));
    const next = data.spells[(idx + delta + data.spells.length) % data.spells.length];
    if (next) setSelectedId(next.id);
  };

  useInput((_input, key) => {
    if (key.upArrow) move(-1);
    if (key.downArrow) move(1);
    if (key.return) setExpanded((v) => !v);
  });

  const incantationsCount = data.spells.filter((s) => s.type === 'incantation').length;
  const wardsCount = data.spells.filter((s) => s.type === 'ward').length;
  const cursesCount = data.spells.filter((s) => s.type === 'curse').length;

  const statusHeader = (
    <Box borderStyle="single" borderColor={palette.greenDim} paddingX={1} marginBottom={1} justifyContent="space-between">
      <Text>
        <Text bold color={palette.green}>SPELLS </Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={palette.violet}>{`${incantationsCount} incantations `}</Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={palette.green}>{`${wardsCount} wards `}</Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={palette.amber}>{`${cursesCount} curses`}</Text>
      </Text>
      <Text color={palette.dim}>{`${data.spells.length} total`}</Text>
    </Box>
  );

  if (data.spells.length === 0) {
    return (
      <Box flexDirection="column">
        {statusHeader}
        <Text color={palette.dim}>no spells in _spells/. check incantations/, wards/, or curses/.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {statusHeader}
      {data.spells.map((s) => {
        const isSelected = s.id === selectedId;
        const color = TYPE_COLORS[s.type] ?? palette.text;
        const badge = TYPE_BADGES[s.type] ?? s.type;

        return (
          <Box key={s.id} flexDirection="column">
            <Text>
              <Text color={isSelected ? palette.green : palette.dim}>{isSelected ? '▸ ' : '  '}</Text>
              <Text color={color} bold>{`[${badge}] `}</Text>
              <Text bold color={isSelected ? palette.text : palette.muted}>{s.name}</Text>
              {s.type === 'ward' && (
                <Text color={palette.dim}>
                  {' · '}
                  <Text color={palette.green}>{s.trigger}</Text>
                  {s.calls && (
                    <>
                      {' → '}
                      <Text color={palette.violet}>{s.calls}</Text>
                    </>
                  )}
                </Text>
              )}
              {s.type === 'curse' && (
                <Text color={palette.dim}>
                  {' · '}
                  <Text color={palette.amber}>{s.severity ?? 'hard'}</Text>
                </Text>
              )}
              {s.description && <Text color={palette.dim}>{` · ${s.description}`}</Text>}
            </Text>

            {isSelected && expanded && (
              <Box marginLeft={4} marginTop={1} flexDirection="column">
                <Text color={palette.dim}>{`file: ${s.relPath}`}</Text>
                <Box borderStyle="single" borderColor={palette.dim} paddingX={1} marginTop={1} flexDirection="column">
                  <Text color={palette.text}>{s.body}</Text>
                </Box>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
