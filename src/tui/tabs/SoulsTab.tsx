import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import matter from 'gray-matter';
import fsExtra from 'fs-extra';
const { readFile, writeFile } = fsExtra;
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useTextInput } from '../hooks/useTextInput.js';
import { detectStack } from '../../scanners/detect-stack.js';
import { ALL_COMPILERS } from '../../compilers/index.js';
import { writeCompiledFile } from '../../utils/files.js';
import { parseSoulFile } from '../../schema/soul.js';
import type { Agent } from '../state/types.js';

type Mode = 'browse' | 'editing';

export function SoulsTab() {
  const { cwd, data, reload } = useDeck();
  const [selectedId, setSelectedId] = useState<string | undefined>(data.agents[0]?.id);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');
  const [status, setStatus] = useState<string | undefined>();

  const move = (delta: number) => {
    if (data.agents.length === 0) return;
    const idx = Math.max(0, data.agents.findIndex((a) => a.id === selectedId));
    const next = data.agents[(idx + delta + data.agents.length) % data.agents.length];
    if (next) setSelectedId(next.id);
  };

  useInput(
    (input, key) => {
      if (mode !== 'browse') return;
      if (key.upArrow) move(-1);
      if (key.downArrow) move(1);
      if (key.return) setExpanded((v) => !v);
      if (input === 'w' && selectedId) {
        setMode('editing');
        setStatus(undefined);
      }
      if (input === 'r' && selectedId) {
        void recompile(selectedId);
      }
    },
    { isActive: mode === 'browse' },
  );

  const roleInput = useTextInput(
    mode === 'editing',
    (value) => {
      void writeRole(selectedId!, value);
    },
    () => setMode('browse'),
  );

  const writeRole = async (agentId: string, role: string) => {
    const agent = data.agents.find((a) => a.id === agentId);
    if (!agent || !role.trim()) {
      setMode('browse');
      return;
    }
    const raw = await readFile(agent.soulPath, 'utf8');
    const { data: frontmatter, content } = matter(raw);
    frontmatter.role = role.trim();
    await writeFile(agent.soulPath, matter.stringify(content, frontmatter), 'utf8');
    setStatus(`updated role for ${agent.name}`);
    setMode('browse');
    reload();
  };

  const recompile = async (agentId: string) => {
    const agent = data.agents.find((a) => a.id === agentId);
    if (!agent) return;
    const soul = parseSoulFile(agent.soulPath);
    const stack = await detectStack(cwd);
    let count = 0;
    for (const compiler of ALL_COMPILERS) {
      if (!(await compiler.detect(cwd))) continue;
      const compiled = compiler.compile(soul, { repoRoot: cwd, stack });
      await writeCompiledFile(cwd, compiled);
      count++;
    }
    setStatus(count > 0 ? `recompiled ${agent.name} for ${count} target(s)` : `no targets detected for ${agent.name}`);
    reload();
  };

  if (data.agents.length === 0) {
    return <Text color={palette.dim}>no souls bound. run `hocus cast` to compile the bundled cast.</Text>;
  }

  const selected: Agent | undefined = data.agents.find((a) => a.id === selectedId);

  return (
    <Box flexDirection="row" gap={2}>
      <Box flexDirection="column">
        {data.agents.map((a) => (
          <Text key={a.id}>
            <Text color={a.id === selectedId ? palette.green : palette.dim}>{a.id === selectedId ? '▸ ' : '  '}</Text>
            <Text color={palette.green}>{a.glyph.padEnd(5)}</Text>
            <Text color={palette.text}>{a.name.padEnd(22)}</Text>
            <Text color={palette.dim}>{a.soulPath}</Text>
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {expanded && selected ? (
          <Box flexDirection="column" borderStyle="single" borderColor={palette.dim} paddingX={1}>
            <Text bold color={palette.green}>{selected.name}</Text>
            <Text color={palette.muted}>{selected.role} · {selected.tier}</Text>
            {selected.aliases?.valley ? <Text color={palette.dim}>valley: {selected.aliases.valley}</Text> : null}
          </Box>
        ) : null}

        {mode === 'editing' ? (
          <Text color={palette.violet}>new role: {roleInput.value}<Text color={palette.dim}>▏</Text></Text>
        ) : null}

        {status ? <Text color={palette.amber}>{status}</Text> : null}

        {data.warnings.filter((w) => w.startsWith('malformed SOUL.md')).map((w) => (
          <Text key={w} color={palette.amber}>{`! ${w}`}</Text>
        ))}
      </Box>
    </Box>
  );
}
