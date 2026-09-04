import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import fsExtra from 'fs-extra';
const { pathExists, remove } = fsExtra;
import path from 'node:path';
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useTextInput } from '../hooks/useTextInput.js';
import { installSkill } from '../../utils/files.js';
import { BUNDLED_SKILLS_DIR } from '../../utils/paths.js';

const SOURCE_COLOR: Record<string, string> = {
  bundled: palette.green,
  local: palette.muted,
  pack: palette.violet,
};

type Mode = 'browse' | 'install-from';

// space toggles mirroring the selected skill into this project (bundled <-> local),
// `i` installs a pack from an arbitrary local path.
export function GrimoireTab() {
  const { cwd, data, reload } = useDeck();
  const [selectedId, setSelectedId] = useState<string | undefined>(data.skills[0]?.id);
  const [mode, setMode] = useState<Mode>('browse');
  const [status, setStatus] = useState<string | undefined>();

  const move = (delta: number) => {
    if (data.skills.length === 0) return;
    const idx = Math.max(0, data.skills.findIndex((s) => s.id === selectedId));
    const next = data.skills[(idx + delta + data.skills.length) % data.skills.length];
    if (next) setSelectedId(next.id);
  };

  useInput(
    (input, key) => {
      if (mode !== 'browse') return;
      if (key.upArrow) move(-1);
      if (key.downArrow) move(1);
      if (input === ' ' && selectedId) void toggleMirror(selectedId);
      if (input === 'i') {
        setMode('install-from');
        setStatus(undefined);
      }
    },
    { isActive: mode === 'browse' },
  );

  const toggleMirror = async (skillId: string) => {
    const skill = data.skills.find((s) => s.id === skillId);
    if (!skill) return;

    if (skill.source === 'bundled') {
      await installSkill(path.join(BUNDLED_SKILLS_DIR, skill.id), cwd, skill.id);
      setStatus(`installed ${skill.name} into this project`);
    } else {
      await remove(path.join(cwd, '.claude', 'skills', skill.id)).catch(() => {});
      await remove(path.join(cwd, '.agents', 'skills', skill.id)).catch(() => {});
      const pluginsDir = path.join(cwd, '.agents', 'plugins');
      const plugins = await fsExtra.readdir(pluginsDir).catch(() => [] as string[]);
      for (const p of plugins) {
        await remove(path.join(pluginsDir, p, 'skills', skill.id)).catch(() => {});
      }
      setStatus(`removed ${skill.name} from this project`);
    }
    reload();
  };

  const pathInput = useTextInput(
    mode === 'install-from',
    (value) => {
      void installFrom(value);
    },
    () => setMode('browse'),
  );

  const installFrom = async (fromPath: string) => {
    const trimmed = fromPath.trim();
    if (!trimmed) {
      setMode('browse');
      return;
    }
    if (!(await pathExists(trimmed))) {
      setStatus(`no skill found at ${trimmed}`);
      setMode('browse');
      return;
    }
    const name = path.basename(trimmed);
    await installSkill(trimmed, cwd, name);
    setStatus(`installed pack "${name}"`);
    setMode('browse');
    reload();
  };

  if (data.skills.length === 0) {
    return <Text color={palette.dim}>grimoire is empty. `hocus skill add &lt;name&gt;` to mirror one in.</Text>;
  }

  return (
    <Box flexDirection="column">
      {data.skills.map((s) => (
        <Box key={s.id} flexDirection="column">
          <Text>
            <Text color={s.id === selectedId ? palette.green : palette.dim}>{s.id === selectedId ? '▸ ' : '  '}</Text>
            <Text color={SOURCE_COLOR[s.source] ?? palette.muted}>{`[${s.source}]`.padEnd(11)}</Text>
            <Text color={palette.text}>{s.name.padEnd(24)}</Text>
            <Text color={palette.dim}>{`${s.enabledFor.length} bound`}</Text>
          </Text>
          <Text color={palette.muted}>{`             ${s.description}`}</Text>
        </Box>
      ))}

      {mode === 'install-from' ? (
        <Text color={palette.violet}>install from path: {pathInput.value}<Text color={palette.dim}>▏</Text></Text>
      ) : null}

      {status ? <Text color={palette.amber}>{status}</Text> : null}

      {data.warnings.filter((w) => w.includes('SKILL.md') || w.includes('skill')).map((w) => (
        <Text key={w} color={palette.amber}>{`! ${w}`}</Text>
      ))}
    </Box>
  );
}
