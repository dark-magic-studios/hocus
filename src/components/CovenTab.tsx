import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { StatusDot } from '../components/StatusDot.js';
import type { Agent, Tier } from '../state/types.js';

const TIER_LABEL: Record<Tier, string> = {
  archmage: 'ARCHMAGE',
  circle: 'THE CIRCLE',
  coven: 'THE COVEN',
  familiar: 'FAMILIARS',
};

function AgentRow({ agent, depth }: { agent: Agent; depth: number }) {
  return (
    <Text>
      <Text>{'   '.repeat(depth)}</Text>
      <Text color={palette.text}>{agent.name.padEnd(24 - depth * 3)}</Text>
      <Text color={palette.muted}>{(agent.scope ?? agent.role).padEnd(20)}</Text>
      <StatusDot status={agent.status} label />
    </Text>
  );
}

// TODO(DMS): ↑↓ cursor, ⏎ inspect, `n` spawns a familiar (writes child SOUL.md with parent:),
// `x` dismisses. Tree rebuilds from disk, never from in-memory state.
export function CovenTab() {
  const { data } = useDeck();
  const { glyph } = useCapabilities();

  if (data.agents.length === 0) {
    return <Text color={palette.dim}>the coven is empty. run `hocus cast` first.</Text>;
  }

  const familiarsOf = (id: string) => data.agents.filter((a) => a.parentId === id);
  const tiers: Tier[] = ['archmage', 'circle', 'coven'];

  return (
    <Box flexDirection="column" gap={1}>
      {tiers.map((tier) => {
        const members = data.agents.filter((a) => a.tier === tier && !a.parentId);
        if (members.length === 0) return null;
        return (
          <Box key={tier} flexDirection="column">
            <Text color={palette.violet}>{`${glyph[tier === 'archmage' ? 'archmage' : tier]} ${TIER_LABEL[tier]}`}</Text>
            {members.map((m) => (
              <Box key={m.id} flexDirection="column">
                <AgentRow agent={m} depth={1} />
                {familiarsOf(m.id).map((f) => <AgentRow key={f.id} agent={f} depth={2} />)}
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
