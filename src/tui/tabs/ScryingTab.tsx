import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';

const usd = (n: number) => `$${n.toFixed(4)}`;
const WINDOW = 12;
const FOLLOW_INTERVAL_MS = 2000;

export function ScryingTab() {
  const { data, reload } = useDeck();
  const [scrollFromEnd, setScrollFromEnd] = useState(0);
  const [following, setFollowing] = useState(false);

  const maxScroll = Math.max(0, data.ledger.length - WINDOW);

  useInput((input, key) => {
    if (key.upArrow) setScrollFromEnd((v) => Math.min(maxScroll, v + 1));
    if (key.downArrow) setScrollFromEnd((v) => Math.max(0, v - 1));
    if (input === 'f') setFollowing((v) => !v);
    if (input === 'c') setScrollFromEnd(0);
  });

  useEffect(() => {
    if (!following) return;
    setScrollFromEnd(0);
    const id = setInterval(reload, FOLLOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [following, reload]);

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
  const end = data.ledger.length - scrollFromEnd;
  const start = Math.max(0, end - WINDOW);
  const visible = data.ledger.slice(start, end);

  return (
    <Box flexDirection="column">
      <Text color={palette.dim}>{following ? 'following · ' : ''}{`showing ${start + 1}-${end} of ${data.ledger.length}`}</Text>
      {visible.map((e, i) => (
        <Text key={`${e.at}-${start + i}`}>
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
