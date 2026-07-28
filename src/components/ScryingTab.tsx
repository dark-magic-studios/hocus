import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';

const usd = (n: number) => `$${n.toFixed(4)}`;

// TODO(DMS): tail .hocus/ledger.jsonl live, aggregate per agent, add a session total
// and a per-spell rollup. This is Midas's screen — it must show a real number.
export function ScryingTab() {
  const { data } = useDeck();

  if (data.ledger.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={palette.dim}>no activity recorded yet.</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color={palette.violet}>wards</Text>
          {data.wards.length === 0
            ? <Text color={palette.dim}>  no tool targets detected in this repo.</Text>
            : data.wards.map((w) => (
                <Text key={w.target}>
                  <Text color={w.detected ? palette.green : palette.dim}>{`  ${w.detected ? 'ok' : '--'} `}</Text>
                  <Text color={palette.text}>{w.target.padEnd(14)}</Text>
                  <Text color={palette.muted}>{w.agentDir ?? ''}</Text>
                </Text>
              ))}
        </Box>
      </Box>
    );
  }

  const total = data.ledger.reduce((sum, e) => sum + e.costUsd, 0);

  return (
    <Box flexDirection="column">
      {data.ledger.slice(-12).map((e, i) => (
        <Text key={`${e.at}-${i}`}>
          <Text color={palette.dim}>{`${e.at} `}</Text>
          <Text color={palette.text}>{e.agentId.padEnd(18)}</Text>
          <Text color={palette.muted}>{e.event.padEnd(22)}</Text>
          <Text color={palette.amber}>{usd(e.costUsd)}</Text>
        </Text>
      ))}
      <Box marginTop={1}>
        <Text color={palette.muted}>session total </Text>
        <Text bold color={palette.amber}>{usd(total)}</Text>
      </Box>
    </Box>
  );
}
