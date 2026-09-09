import React from 'react';
import { Box, Text, useInput } from 'ink';
import { palette } from '../theme.js';
import { BrandMark } from '../components/BrandMark.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useBootTasks, type BootTask } from './useBootTasks.js';

interface Props {
  version: string;
  tasks: BootTask[];
  silent: boolean;
  onDone: () => void;
}

export function BootSequence({ version, tasks, silent, onDone }: Props) {
  const { glyph } = useCapabilities();
  const { lines, done, finish } = useBootTasks(tasks, silent);

  useInput(() => { finish(); });

  React.useEffect(() => { if (done) onDone(); }, [done, onDone]);

  if (silent) return null;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Box marginRight={2}>
          <BrandMark />
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={palette.text}>{`v${version}`}</Text>
          <Text color={palette.dim}>dark magic studios</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {lines.map((l) => (
          <Text key={l.id}>
            <Text color={l.failed ? palette.red : palette.violet}>{`  ${glyph.spark} `}</Text>
            <Text color={palette.muted}>{l.label.padEnd(22, '.')}</Text>
            <Text color={l.failed ? palette.red : palette.green}>{` ${l.result ?? ''}`}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
