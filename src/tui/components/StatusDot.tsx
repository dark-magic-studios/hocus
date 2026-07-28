import React from 'react';
import { Text } from 'ink';
import { statusColor, type AgentStatus } from '../theme.js';
import { useCapabilities } from '../hooks/useCapabilities.js';

export function StatusDot({ status, label }: { status: AgentStatus; label?: boolean }) {
  const { glyph } = useCapabilities();
  return (
    <Text color={statusColor[status]}>
      {glyph[status]}
      {label ? ` ${status}` : ''}
    </Text>
  );
}
