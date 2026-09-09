import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import matter from 'gray-matter';
import fsExtra from 'fs-extra';
const { readFile, writeFile } = fsExtra;
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useTextInput } from '../hooks/useTextInput.js';
import { useListWindow } from '../hooks/useListWindow.js';
import { detectStack } from '../../scanners/detect-stack.js';
import { ALL_COMPILERS } from '../../compilers/index.js';
import { writeCompiledFile } from '../../utils/files.js';
import { parseSoulFile, type SoulFile } from '../../schema/soul.js';
import { AbsorbPrompt } from '../components/AbsorbPrompt.js';
import {
  findAvailablePersonas,
  findAgentsUsingPersona,
  executeAbsorb,
  type AgentGroup,
} from '../../utils/absorb.js';
import { migrateProjectCast } from '../../utils/cast-migrate.js';
import { createCustomCast, deleteCustomCast } from '../../utils/cast-registry.js';
import type { Agent } from '../state/types.js';

type Mode = 'browse' | 'editing' | 'absorb' | 'cast-select' | 'cast-create';

export function SoulsTab() {
  const { cwd, data, reload } = useDeck();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');
  const [status, setStatus] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [castIndex, setCastIndex] = useState(() =>
    Math.max(0, data.availableCasts.findIndex((c) => c.id === data.cast)),
  );
  const [absorbData, setAbsorbData] = useState<{
    targetSoul: SoulFile;
    availablePersonas: SoulFile[];
    agentGroups: AgentGroup[];
  } | null>(null);

  const reservedRows = 2 + (status ? 1 : 0) + (busy ? 1 : 0);
  const {
    selectedIndex,
    windowStart,
    visibleEnd,
    move,
    showingLabel,
  } = useListWindow(data.agents.length, { reservedRows, linesPerItem: 1 });

  const visibleAgents = data.agents.slice(windowStart, visibleEnd);
  const selected: Agent | undefined = data.agents[selectedIndex];

  const moveCast = (delta: number) => {
    if (data.availableCasts.length === 0) return;
    setCastIndex((prev) => (prev + delta + data.availableCasts.length) % data.availableCasts.length);
  };

  useInput(
    (input, key) => {
      if (busy) return;
      if (mode === 'cast-select') {
        if (key.upArrow) moveCast(-1);
        if (key.downArrow) moveCast(1);
        if (key.return) void applyCast(data.availableCasts[castIndex]?.id);
        if (input === 'n') {
          setMode('cast-create');
          setStatus(undefined);
        }
        if (input === 'd') {
          const target = data.availableCasts[castIndex];
          if (target && !target.builtin) void removeCast(target.id);
        }
        if (key.escape) setMode('browse');
        return;
      }
      if (mode !== 'browse') return;
      if (key.upArrow) move(-1);
      if (key.downArrow) move(1);
      if (key.return) setExpanded((v) => !v);
      if (input === 'c') {
        setCastIndex(Math.max(0, data.availableCasts.findIndex((c) => c.id === data.cast)));
        setMode('cast-select');
        setStatus(undefined);
      }
      if (input === 'w' && selected) {
        setMode('editing');
        setStatus(undefined);
      }
      if (input === 'r' && selected) {
        void recompile(selected.id);
      }
      if (input === 'a' && selected) {
        void startAbsorb(selected.id);
      }
    },
    { isActive: mode !== 'editing' && mode !== 'absorb' && mode !== 'cast-create' },
  );

  const castCreateInput = useTextInput(
    mode === 'cast-create',
    (value) => {
      void createCast(value);
    },
    () => setMode('cast-select'),
  );

  const applyCast = async (castId: string | undefined) => {
    if (!castId || castId === data.cast) {
      setMode('browse');
      return;
    }
    setBusy(true);
    setStatus(undefined);
    try {
      await migrateProjectCast(cwd, castId);
      setStatus(`recast to ${castId}`);
      setMode('browse');
      reload();
    } catch (e) {
      setStatus(`recast failed: ${String(e)}`);
      setMode('browse');
    } finally {
      setBusy(false);
    }
  };

  const createCast = async (raw: string) => {
    const id = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!id) {
      setMode('cast-select');
      return;
    }
    setBusy(true);
    try {
      await createCustomCast(cwd, id);
      setStatus(`created "${id}" — edit .hocus/casts/${id}.json then recast`);
      setMode('cast-select');
      reload();
    } catch (e) {
      setStatus(String(e));
      setMode('cast-select');
    } finally {
      setBusy(false);
    }
  };

  const removeCast = async (castId: string) => {
    setBusy(true);
    try {
      await deleteCustomCast(cwd, castId);
      if (data.cast === castId) {
        await migrateProjectCast(cwd, 'wizard');
      }
      setStatus(`deleted cast "${castId}"`);
      setCastIndex(0);
      reload();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  };

  const startAbsorb = async (agentId: string) => {
    const agent = data.agents.find((a) => a.id === agentId);
    if (!agent) return;
    try {
      const allSouls = await findAvailablePersonas(cwd);
      const targetSoul = allSouls.find((s) => s.character === agentId);
      if (!targetSoul) {
        setStatus(`cannot absorb: persona "${agent.name}" not found`);
        return;
      }
      const otherSouls = allSouls.filter((s) => s.character !== agentId);
      if (otherSouls.length === 0) {
        setStatus("cannot absorb: need at least one other persona in .hocus/personas/");
        return;
      }
      const agentGroups = await findAgentsUsingPersona(cwd, agentId);
      setAbsorbData({ targetSoul, availablePersonas: otherSouls, agentGroups });
      setMode('absorb');
      setStatus(undefined);
    } catch (e) {
      setStatus(`failed to prepare absorb: ${String(e)}`);
    }
  };

  const handleConfirmAbsorb = async (assignments: Record<string, string>) => {
    if (!absorbData) return;
    try {
      const res = await executeAbsorb({
        repoRoot: cwd,
        targetPersona: absorbData.targetSoul.character,
        assignments,
      });
      setStatus(`absorbed ${absorbData.targetSoul.display_name}: migrated ${res.migratedAgents.length} agent(s)`);
      setMode('browse');
      setAbsorbData(null);
      reload();
    } catch (e) {
      setStatus(`absorb failed: ${String(e)}`);
      setMode('browse');
      setAbsorbData(null);
    }
  };

  const roleInput = useTextInput(
    mode === 'editing',
    (value) => {
      if (selected) void writeRole(selected.id, value);
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

  if (data.agents.length === 0 && mode === 'browse') {
    return <Text color={palette.dim}>no souls bound. run `hocus init` to install the cast.</Text>;
  }

  if (mode === 'absorb' && absorbData) {
    return (
      <AbsorbPrompt
        targetPersona={absorbData.targetSoul}
        availablePersonas={absorbData.availablePersonas}
        agentGroups={absorbData.agentGroups}
        onConfirm={(assignments) => void handleConfirmAbsorb(assignments)}
        onCancel={() => {
          setMode('browse');
          setAbsorbData(null);
        }}
      />
    );
  }

  if (mode === 'cast-select' || mode === 'cast-create') {
    return (
      <Box flexDirection="column">
        <Text bold color={palette.violet}>select cast</Text>
        <Text color={palette.dim}>↑↓ navigate · ⏎ recast · n new · d delete custom · esc cancel</Text>
        {data.availableCasts.map((c, i) => (
          <Text key={c.id}>
            <Text color={i === castIndex ? palette.green : palette.dim}>{i === castIndex ? '▸ ' : '  '}</Text>
            <Text color={c.id === data.cast ? palette.green : palette.text}>{c.id.padEnd(14)}</Text>
            <Text color={palette.muted}>{c.label}</Text>
            {!c.builtin ? <Text color={palette.dim}> custom</Text> : null}
            {c.id === data.cast ? <Text color={palette.green}> (active)</Text> : null}
          </Text>
        ))}
        {mode === 'cast-create' ? (
          <Text color={palette.violet}>new cast id: {castCreateInput.value}<Text color={palette.dim}>▏</Text></Text>
        ) : null}
        {busy ? <Text color={palette.violet}>recasting…</Text> : null}
        {status ? <Text color={palette.amber}>{status}</Text> : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color={palette.dim}>
        cast: <Text color={palette.green}>{data.cast}</Text>
        {' · '}
        <Text color={palette.muted}>{data.castLabel}</Text>
        {' · '}
        <Text color={palette.violet}>c</Text>
        <Text color={palette.dim}> switch</Text>
      </Text>
      {data.agents.length > 0 ? <Text color={palette.dim}>{showingLabel}</Text> : null}

      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column">
          {visibleAgents.map((a) => (
            <Text key={a.id} wrap="truncate-end">
              <Text color={a.id === selected?.id ? palette.green : palette.dim}>{a.id === selected?.id ? '▸ ' : '  '}</Text>
              <Text color={palette.green}>{a.glyph.padEnd(5)}</Text>
              <Text bold color={a.id === selected?.id ? palette.text : palette.muted}>{a.name.padEnd(20)}</Text>
              <Text color={palette.dim}>{a.id}</Text>
            </Text>
          ))}
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          {expanded && selected ? (
            <Box flexDirection="column" borderStyle="single" borderColor={palette.dim} paddingX={1}>
              <Text bold color={palette.green}>{selected.name}</Text>
              <Text color={palette.muted}>{selected.role} · {selected.tier}</Text>
              <Text color={palette.dim}>slug: {selected.id}</Text>
              {selected.aliases?.valley ? <Text color={palette.dim}>valley: {selected.aliases.valley}</Text> : null}
              {selected.aliases?.occult ? <Text color={palette.dim}>wizard: {selected.aliases.occult}</Text> : null}
            </Box>
          ) : null}

          {mode === 'editing' ? (
            <Text color={palette.violet}>new role: {roleInput.value}<Text color={palette.dim}>▏</Text></Text>
          ) : null}

          {busy ? <Text color={palette.violet}>working…</Text> : null}
          {status ? <Text color={palette.amber}>{status}</Text> : null}

          {data.warnings.filter((w) => w.startsWith('malformed SOUL.md')).map((w) => (
            <Text key={w} color={palette.amber}>{`! ${w}`}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
