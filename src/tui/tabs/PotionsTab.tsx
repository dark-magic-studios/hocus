import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import matter from 'gray-matter';
import fsExtra from 'fs-extra';
const { readFile, writeFile } = fsExtra;
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useTextInput } from '../hooks/useTextInput.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { StatusDot } from '../components/StatusDot.js';
import { runExpressUpdate } from '../utils/expressUpdate.js';

type Mode = 'browse' | 'assigning';

export function PotionsTab() {
  const { cwd, data, reload } = useDeck();
  const [selectedId, setSelectedId] = useState<string | undefined>(data.potions[0]?.id);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');
  const [status, setStatus] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const hocusStatus = data.status;

  const move = (delta: number) => {
    if (data.potions.length === 0) return;
    const idx = Math.max(0, data.potions.findIndex((s) => s.id === selectedId));
    const next = data.potions[(idx + delta + data.potions.length) % data.potions.length];
    if (next) setSelectedId(next.id);
  };

  useInput(
    (input, key) => {
      if (mode !== 'browse' || busy) return;
      if (key.upArrow) move(-1);
      if (key.downArrow) move(1);
      if (key.return) setExpanded((v) => !v);
      if (input === 'a' && selectedId) {
        setMode('assigning');
        setStatus(undefined);
      }
      if (input === 'x' && !hocusStatus?.isUpToDate) {
        void expressInstall();
      }
    },
    { isActive: mode === 'browse' && !busy },
  );

  const expressInstall = async () => {
    setBusy(true);
    setStatus(undefined);
    try {
      const message = await runExpressUpdate(cwd, data.status);
      setStatus(message);
      reload();
    } catch (e) {
      setStatus(`express update failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const assignInput = useTextInput(
    mode === 'assigning',
    (value) => {
      void assign(selectedId!, value);
    },
    () => setMode('browse'),
  );

  const assign = async (potionId: string, agentId: string) => {
    const potion = data.potions.find((s) => s.id === potionId);
    if (!potion || !agentId.trim()) {
      setMode('browse');
      return;
    }
    const raw = await readFile(potion.path, 'utf8');
    const { data: frontmatter, content } = matter(raw);
    frontmatter.assigned_to = agentId.trim();
    await writeFile(potion.path, matter.stringify(content, frontmatter), 'utf8');
    setStatus(`assigned ${potion.name} to ${agentId.trim()}`);
    setMode('browse');
    reload();
  };

  const statusHeader = (
    <Box borderStyle="single" borderColor={hocusStatus?.isUpToDate ? palette.green : palette.amber} paddingX={1} marginBottom={1} justifyContent="space-between">
      <Text>
        <Text bold color={palette.green}>HOCUS STATUS </Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={hocusStatus?.installed ? palette.text : palette.amber}>{hocusStatus?.installed ? 'Installed' : 'Not Installed'} </Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={palette.violet}>{`${hocusStatus?.agentCount ?? 0} agents `}</Text>
        <Text color={palette.dim}>│ </Text>
        <Text color={palette.text}>{`${hocusStatus?.skillCount ?? 0} skills `}</Text>
      </Text>
      <Text color={hocusStatus?.isUpToDate ? palette.green : palette.amber} bold>
        {hocusStatus?.isUpToDate ? '● Up-to-date' : '▲ Out-of-date'}
      </Text>
    </Box>
  );

  const statusDetail = !hocusStatus?.isUpToDate ? (
    <Text color={palette.amber}>
      {hocusStatus?.statusMessage}
      {!busy ? <Text color={palette.dim}> · press </Text> : null}
      {!busy ? <Text color={palette.green}>x</Text> : null}
      {!busy ? <Text color={palette.dim}> for express update</Text> : null}
    </Text>
  ) : null;

  if (data.potions.length === 0) {
    return (
      <Box flexDirection="column">
        {statusHeader}
        {statusDetail}
        {busy ? <Text color={palette.violet}>running express update…</Text> : null}
        {status ? <Text color={palette.amber}>{status}</Text> : null}
        <Text color={palette.dim}>no potions in _potions/. run `hocus draft` to write the first one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {statusHeader}
      {statusDetail}
      {data.potions.map((s) => (
        <Box key={s.id} flexDirection="column">
          <Text>
            <Text color={s.id === selectedId ? palette.green : palette.dim}>{s.id === selectedId ? '▸ ' : '  '}</Text>
            <StatusDot status={s.status === 'casting' ? 'active' : s.status === 'blocked' ? 'blocked' : 'idle'} />
            <Text bold color={palette.violet}>{` ${s.name}`}</Text>
            <Text color={palette.dim}>{`  ${s.aka}`}</Text>
          </Text>
          <Text color={palette.muted}>
            {`  drafted ${s.draftedBy}${s.assignedTo ? ` · assigned ${s.assignedTo}` : ''}${s.reviewedBy ? ` · review ${s.reviewedBy}` : ''}`}
          </Text>
          {s.note ? <Text color={palette.amber}>{`  ${s.note}`}</Text> : null}
          <Box marginLeft={2}><ProgressBar value={s.progress} /></Box>
          {expanded && s.id === selectedId ? (
            <Box marginLeft={2} borderStyle="single" borderColor={palette.dim} paddingX={1}>
              <Text color={palette.dim}>{s.path}</Text>
            </Box>
          ) : null}
        </Box>
      ))}

      {mode === 'assigning' ? (
        <Text color={palette.violet}>assign to (agent slug): {assignInput.value}<Text color={palette.dim}>▏</Text></Text>
      ) : null}

      {busy ? <Text color={palette.violet}>running express update…</Text> : null}
      {status ? <Text color={palette.amber}>{status}</Text> : null}

      {data.warnings.filter((w) => w.includes('potion')).map((w) => (
        <Text key={w} color={palette.amber}>{`! ${w}`}</Text>
      ))}
    </Box>
  );
}
