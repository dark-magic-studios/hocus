import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import path from 'node:path';
import matter from 'gray-matter';
import fsExtra from 'fs-extra';
const { ensureDir, move, writeFile } = fsExtra;
import { palette } from '../theme.js';
import { useDeck } from '../state/DeckContext.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useTextInput } from '../hooks/useTextInput.js';
import { StatusDot } from '../components/StatusDot.js';
import type { Agent, Tier } from '../state/types.js';

const TIER_LABEL: Record<Tier, string> = {
  archmage: 'ARCHMAGE',
  circle: 'THE CIRCLE',
  coven: 'THE COVEN',
  familiar: 'FAMILIARS',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'familiar';
}

function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function wouldCycle(childId: string, parentId: string, agents: Agent[]): boolean {
  const byId = new Map(agents.map((a) => [a.id, a] as const));
  let current: string | undefined = parentId;
  const seen = new Set<string>([childId]);
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.parentId;
  }
  return false;
}

function AgentRow({ agent, depth, selected }: { agent: Agent; depth: number; selected: boolean }) {
  return (
    <Text>
      <Text color={selected ? palette.green : palette.dim}>{selected ? '▸ ' : '  '}</Text>
      <Text>{'   '.repeat(depth)}</Text>
      <Text color={palette.text}>{agent.name.padEnd(24 - depth * 3)}</Text>
      <Text color={palette.muted}>{(agent.scope ?? agent.role).padEnd(20)}</Text>
      <StatusDot status={agent.status} label />
    </Text>
  );
}

type Mode = 'browse' | 'spawn-name' | 'spawn-scope';

export function CovenTab() {
  const { cwd, data, reload } = useDeck();
  const { glyph } = useCapabilities();
  const [selectedId, setSelectedId] = useState<string | undefined>(data.agents[0]?.id);
  const [inspecting, setInspecting] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');
  const [pendingName, setPendingName] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const familiarsOf = (id: string) => data.agents.filter((a) => a.parentId === id);
  const tiers: Tier[] = ['archmage', 'circle', 'coven'];
  const orphans = data.agents.filter(
    (a) => a.parentId && !data.agents.some((p) => p.id === a.parentId),
  );

  const rows: Agent[] = [
    ...tiers.flatMap((tier) => {
      const members = data.agents.filter((a) => a.tier === tier && !a.parentId);
      return members.flatMap((m) => [m, ...familiarsOf(m.id)]);
    }),
    ...orphans,
  ];

  const move_ = (delta: number) => {
    if (rows.length === 0) return;
    const idx = Math.max(0, rows.findIndex((r) => r.id === selectedId));
    const next = rows[(idx + delta + rows.length) % rows.length];
    if (next) setSelectedId(next.id);
  };

  useInput(
    (input, key) => {
      if (mode !== 'browse') return;
      if (key.upArrow) move_(-1);
      if (key.downArrow) move_(1);
      if (key.return) setInspecting((v) => !v);
      if (input === 'n' && selectedId) {
        setMode('spawn-name');
        setStatus(undefined);
      }
      if (input === 'x' && selectedId) {
        const agent = data.agents.find((a) => a.id === selectedId);
        if (agent) {
          void dismiss(agent);
        }
      }
    },
    { isActive: mode === 'browse' },
  );

  const dismiss = async (agent: Agent) => {
    const dismissedDir = path.join(path.dirname(agent.soulPath), '.dismissed');
    await ensureDir(dismissedDir);
    await move(agent.soulPath, path.join(dismissedDir, path.basename(agent.soulPath)), { overwrite: true });
    setStatus(`dismissed ${agent.name}`);
    reload();
  };

  const nameInput = useTextInput(
    mode === 'spawn-name',
    (value) => {
      if (!value.trim()) return;
      setPendingName(value.trim());
      setMode('spawn-scope');
    },
    () => setMode('browse'),
  );

  const scopeInput = useTextInput(
    mode === 'spawn-scope',
    (scope) => {
      void spawnFamiliar(pendingName, scope);
    },
    () => setMode('browse'),
  );

  const spawnFamiliar = async (name: string, scope: string) => {
    const parentId = selectedId!;
    const existingIds = new Set(data.agents.map((a) => a.id));
    const slug = uniqueSlug(slugify(name), existingIds);

    if (wouldCycle(slug, parentId, data.agents)) {
      setStatus(`refused to spawn "${name}" — would create a circular parent reference`);
      setMode('browse');
      return;
    }

    const personasDir = path.dirname(data.agents.find((a) => a.id === parentId)?.soulPath ?? '');
    const dest = path.join(personasDir, `${slug}.soul.md`);

    const frontmatter = {
      character: slug,
      display_name: name.trim(),
      role: 'familiar',
      voice: 'a familiar spirit, newly bound',
      glyph: glyph.familiar,
      parent: parentId,
      scope: scope.trim() || undefined,
      triggers: [],
    };
    const body = `# ${name.trim()}\n\nA familiar bound to ${parentId}.\n`;
    await writeFile(dest, matter.stringify(body, frontmatter), 'utf8');

    setStatus(`spawned ${name.trim()} under ${parentId}`);
    setMode('browse');
    setSelectedId(slug);
    reload();
  };

  if (data.agents.length === 0) {
    return <Text color={palette.dim}>the coven is empty. run `hocus cast` first.</Text>;
  }

  const inspected = data.agents.find((a) => a.id === selectedId);

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
                <AgentRow agent={m} depth={1} selected={m.id === selectedId} />
                {familiarsOf(m.id).map((f) => (
                  <AgentRow key={f.id} agent={f} depth={2} selected={f.id === selectedId} />
                ))}
              </Box>
            ))}
          </Box>
        );
      })}

      {orphans.length > 0 ? (
        <Box flexDirection="column">
          <Text color={palette.amber}>{`${glyph.blocked} ORPHANED`}</Text>
          {orphans.map((o) => (
            <AgentRow key={o.id} agent={o} depth={1} selected={o.id === selectedId} />
          ))}
        </Box>
      ) : null}

      {inspecting && inspected ? (
        <Box flexDirection="column" borderStyle="single" borderColor={palette.dim} paddingX={1}>
          <Text bold color={palette.green}>{inspected.name}</Text>
          <Text color={palette.muted}>{inspected.role} · {inspected.tier}{inspected.parentId ? ` · parent: ${inspected.parentId}` : ''}</Text>
          <Text color={palette.dim}>{inspected.soulPath}</Text>
        </Box>
      ) : null}

      {mode === 'spawn-name' ? (
        <Text color={palette.violet}>spawn familiar — name: {nameInput.value}<Text color={palette.dim}>▏</Text></Text>
      ) : null}
      {mode === 'spawn-scope' ? (
        <Text color={palette.violet}>spawn familiar — scope: {scopeInput.value}<Text color={palette.dim}>▏</Text></Text>
      ) : null}

      {status ? <Text color={palette.amber}>{status}</Text> : null}

      {data.warnings.filter((w) => w.includes('agent') || w.includes('SOUL.md')).map((w) => (
        <Text key={w} color={palette.amber}>{`! ${w}`}</Text>
      ))}
    </Box>
  );
}
