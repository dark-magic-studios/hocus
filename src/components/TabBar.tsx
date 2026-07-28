import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { TAB_IDS, type TabId } from '../hooks/useTabs.js';

export function TabBar({ active }: { active: TabId }) {
  return (
    <Box paddingX={1} gap={2}>
      {TAB_IDS.map((id, i) => {
        const on = id === active;
        return (
          <Text key={id} color={on ? palette.green : palette.dim} bold={on}>
            {on ? `[${id}]` : ` ${id} `}
            <Text color={palette.dim}>{` ${i + 1}`}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
