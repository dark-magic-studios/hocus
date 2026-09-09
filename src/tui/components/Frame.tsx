import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { TabBar } from './TabBar.js';
import { Footer } from './Footer.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { paneBoxHeight } from '../layout.js';
import type { TabId } from '../hooks/useTabs.js';

interface FrameProps {
  active: TabId;
  clock: string;
  version: string;
  hints: string[];
  children: React.ReactNode;
}

export function Frame({ active, clock, version, hints, children }: FrameProps) {
  const { columns, rows } = useTerminalSize();
  const width = Math.min(columns - 2, 100);
  const contentHeight = paneBoxHeight(rows);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={palette.greenDim} width={width}>
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color={palette.text}>{`hocus v${version}`}</Text>
        <Text color={palette.dim}>{clock}</Text>
      </Box>
      <TabBar active={active} />
      <Box flexDirection="column" paddingX={1} paddingY={1} height={contentHeight} overflow="hidden">
        {children}
      </Box>
      <Footer hints={hints} />
    </Box>
  );
}
