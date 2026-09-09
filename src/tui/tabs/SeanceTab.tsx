import React, { useRef, useState } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';
import { palette } from '../theme.js';
import { BrandMark } from '../components/BrandMark.js';
import { useDeck } from '../state/DeckContext.js';
import { useFileIndex } from '../hooks/useFileIndex.js';
import { BACKENDS } from '../chat/backends.js';
import { runBackend, type SpawnFn } from '../chat/runBackend.js';
import { resolvePrompt } from '../chat/resolvePrompt.js';
import { getBuiltinCommands, isBuiltinCommand, runBuiltin } from '../chat/builtins.js';

type Role = 'user' | 'assistant' | 'system' | 'error';

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  meta?: string;
}

const ROLE_LABEL: Record<Role, string> = { user: 'you', assistant: 'reply', system: '·', error: '!' };
const ROLE_COLOR: Record<Role, string> = {
  user: palette.text,
  assistant: palette.green,
  system: palette.dim,
  error: palette.red,
};

const TRANSCRIPT_WINDOW = 6;
const MAX_SUGGESTIONS = 6;

export interface SeanceTabProps {
  /** Injectable for tests — defaults to node:child_process's real spawn. */
  spawnImpl?: SpawnFn;
}

export function SeanceTab({ spawnImpl }: SeanceTabProps = {}) {
  const { cwd, data } = useDeck();
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const fileIndex = useFileIndex(cwd);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [backendIndex, setBackendIndex] = useState(0);
  const [agentIndex, setAgentIndex] = useState(0);
  const [suggestIndex, setSuggestIndex] = useState(0);

  const cancelRef = useRef<(() => void) | undefined>(undefined);
  const idRef = useRef(0);
  const nextId = () => `m${idRef.current++}`;

  const agents = data.agents;
  const agent = agents.length > 0 ? agents[agentIndex % agents.length] : undefined;
  const backend = BACKENDS[backendIndex % BACKENDS.length]!;

  const lastSpace = value.lastIndexOf(' ');
  const trailingStart = lastSpace + 1;
  const token = value.slice(trailingStart);
  const isSkillToken = trailingStart === 0 && token.startsWith('/');
  const isFileToken = token.startsWith('@');

  const suggestionKind: 'skill' | 'file' | undefined = isSkillToken ? 'skill' : isFileToken ? 'file' : undefined;
  const suggestionItems: string[] = (() => {
    if (suggestionKind === 'skill') {
      const query = token.slice(1).toLowerCase();
      const builtinMatches = getBuiltinCommands(cwd).filter((n) => n.includes(query));
      const skillMatches = data.skills
        .filter((s) => s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query))
        .map((s) => s.id);
      return [...builtinMatches, ...skillMatches].slice(0, MAX_SUGGESTIONS);
    }
    if (suggestionKind === 'file') {
      const query = token.slice(1).toLowerCase();
      if (!query) return [];
      return fileIndex.files.filter((f) => f.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS);
    }
    return [];
  })();
  const clampedSuggestIndex = suggestionItems.length > 0 ? Math.min(suggestIndex, suggestionItems.length - 1) : 0;

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;

    setMessages((m) => [...m, { id: nextId(), role: 'user', text: trimmed }]);
    setValue('');
    setSuggestIndex(0);

    const commandMatch = trimmed.match(/^\/(\S+)(?:\s+(.*))?$/s);
    const commandToken = commandMatch?.[1];
    if (commandToken && isBuiltinCommand(commandToken, cwd)) {
      setBusy(true);
      const args = (commandMatch![2] ?? '').split(/\s+/).filter(Boolean);
      // /init hands the terminal to an interactive `claude` session — Ink's
      // raw-mode stdin listener has to step out of the way or it'll race the
      // child process for keystrokes.
      const suspend = commandToken === 'init';
      if (suspend) {
        if (isRawModeSupported) setRawMode(false);
        stdin?.pause();
      }
      let result;
      try {
        result = await runBuiltin(commandToken, args, { cwd });
      } finally {
        if (suspend) {
          stdin?.resume();
          if (isRawModeSupported) setRawMode(true);
        }
      }
      setBusy(false);
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: result.ok ? 'system' : 'error',
          text: result.lines.length > 0 ? result.lines.join('\n') : result.ok ? 'done.' : 'failed.',
          meta: `hocus ${commandToken}`,
        },
      ]);
      return;
    }

    const usedAgent = agent;
    const usedBackend = backend;
    setBusy(true);

    const { prompt, notes } = await resolvePrompt(trimmed, cwd, data.skills);
    if (notes.length > 0) {
      setMessages((m) => [...m, ...notes.map((n) => ({ id: nextId(), role: 'system' as const, text: n }))]);
    }

    const finalPrompt = usedAgent ? `[persona: ${usedAgent.name} — ${usedAgent.role}]\n${prompt}` : prompt;
    const handle = runBackend(usedBackend.command, usedBackend.args(finalPrompt), cwd, spawnImpl);
    cancelRef.current = handle.cancel;
    const result = await handle.result;
    cancelRef.current = undefined;
    setBusy(false);
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        role: result.ok ? 'assistant' : 'error',
        text: result.output,
        meta: `${usedAgent ? usedAgent.name : 'no agent'} · ${usedBackend.label}`,
      },
    ]);
  };

  useInput((input, key) => {
    if (suggestionItems.length > 0) {
      if (key.upArrow) {
        setSuggestIndex((i) => (i - 1 + suggestionItems.length) % suggestionItems.length);
        return;
      }
      if (key.downArrow) {
        setSuggestIndex((i) => (i + 1) % suggestionItems.length);
        return;
      }
      if (key.tab || key.return) {
        const chosen = suggestionItems[clampedSuggestIndex]!;
        const prefix = value.slice(0, trailingStart);
        const insertion = suggestionKind === 'skill' ? `/${chosen}` : `@${chosen}`;
        setValue(`${prefix}${insertion} `);
        setSuggestIndex(0);
        return;
      }
      if (key.escape) {
        setValue(value.slice(0, trailingStart));
        setSuggestIndex(0);
        return;
      }
    }

    if (key.tab) {
      if (agents.length > 0) setAgentIndex((i) => (i + 1) % agents.length);
      return;
    }
    if (key.ctrl && input === 'b') {
      setBackendIndex((i) => (i + 1) % BACKENDS.length);
      return;
    }
    if (key.escape) {
      if (busy) cancelRef.current?.();
      else setValue('');
      return;
    }
    if (key.return) {
      if (!busy) void submit();
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      setSuggestIndex(0);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input);
      setSuggestIndex(0);
    }
  });

  const visibleMessages = messages.slice(-TRANSCRIPT_WINDOW);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <BrandMark compact />
        <Text color={palette.dim}>{'  the seance — commune with the coven'}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color={palette.violet}>{'model  '}</Text>
          <Text color={palette.text}>{backend.label}</Text>
          <Text color={palette.dim}>{`  (${backend.command} -p · ctrl+b to cycle)`}</Text>
        </Text>
        <Text>
          <Text color={palette.violet}>{'agent  '}</Text>
          <Text color={palette.text}>{agent ? `${agent.name} — ${agent.role}` : 'none bound'}</Text>
          <Text color={palette.dim}>{agents.length > 1 ? '  (tab to cycle)' : ''}</Text>
        </Text>
      </Box>

      <Box flexDirection="column">
        {visibleMessages.length === 0 ? (
          <Text color={palette.dim}>no messages yet. type, then ⏎ to send.</Text>
        ) : (
          visibleMessages.map((m) => (
            <Box key={m.id} flexDirection="column">
              <Text>
                <Text bold={m.role !== 'system'} color={ROLE_COLOR[m.role]}>{ROLE_LABEL[m.role]}</Text>
                {m.meta ? <Text color={palette.dim}>{` (${m.meta})`}</Text> : null}
              </Text>
              <Text color={m.role === 'error' ? palette.red : palette.text}>{m.text}</Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>{'> '}</Text>
        <Text color={palette.text}>{value}</Text>
        <Text color={palette.dim}>▏</Text>
        {busy ? <Text color={palette.amber}>{'  thinking… (esc to cancel)'}</Text> : null}
      </Box>

      {suggestionItems.length > 0 ? (
        <Box flexDirection="column" borderStyle="single" borderColor={palette.dim} paddingX={1}>
          {suggestionItems.map((item, i) => (
            <Text key={item} color={i === clampedSuggestIndex ? palette.green : palette.dim}>
              {`${i === clampedSuggestIndex ? '▸ ' : '  '}${suggestionKind === 'skill' ? '/' : '@'}${item}`}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
