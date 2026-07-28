import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { parseSoulFile } from "../schema/soul.js";
import { readSpells } from "../schema/spell.js";
import { PROJECT_PERSONAS_DIR, PROJECT_SPELLS_DIR } from "../utils/paths.js";
import type { SoulFile } from "../schema/soul.js";
import type { Spell } from "../schema/spell.js";
import { theme } from "../theme.js";

export interface TuiOptions {
  repoRoot: string;
  projectName?: string;
}

async function loadPersonas(personasDir: string): Promise<SoulFile[]> {
  try {
    const files = (await readdir(personasDir)).filter((f) => f.endsWith(".soul.md"));
    return files.map((f) => parseSoulFile(path.join(personasDir, f)));
  } catch {
    return [];
  }
}

function makeProgressBar(progress: number, width = 10): string {
  const filled = Math.round((progress / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function statusColor(status: string): string {
  switch (status) {
    case "casting": return theme.green;
    case "blocked": return theme.amber;
    case "done": return theme.violet;
    default: return theme.textDim;
  }
}

function Select({
  options,
  selectedIndex,
}: {
  options: { name: string; description?: string; value: SoulFile }[];
  selectedIndex: number;
}) {
  return (
    <Box flexDirection="column" width="100%">
      {options.map((opt, i) => (
        <Box key={opt.name} flexDirection="column">
          <Box>
            <Text color={i === selectedIndex ? theme.green : theme.text}>
              {i === selectedIndex ? "▸ " : "  "}
              {opt.name}
            </Text>
          </Box>
          {opt.description ? (
            <Box paddingLeft={4}>
              <Text color={i === selectedIndex ? theme.textMuted : theme.textDim}>
                {opt.description}
              </Text>
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function App({ repoRoot, projectName }: TuiOptions) {
  const name = projectName ?? path.basename(repoRoot);
  const { exit } = useApp();

  const [personas, setPersonas] = useState<SoulFile[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    loadPersonas(PROJECT_PERSONAS_DIR(repoRoot)).then(setPersonas);
    readSpells(PROJECT_SPELLS_DIR(repoRoot)).then(setSpells);
  }, [repoRoot]);

  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(0, personas.length - 1)));
  }, [personas.length]);

  const activeSpells = spells.filter(
    (s) => s.status === "casting" || s.status === "blocked"
  );

  useInput((input, key) => {
    if (input === "q" || input === "Q") {
      exit();
      return;
    }
    if (key.upArrow && personas.length > 0) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    }
    if (key.downArrow && personas.length > 0) {
      setSelectedIdx((i) => Math.min(personas.length - 1, i + 1));
    }
  });

  const selectedPersona = personas[selectedIdx];

  const spellCards =
    spells.length > 0
      ? spells.map((s) => (
          <Box key={s.spell} flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1}>
              <Text color={statusColor(s.status)}>
                {s.status === "casting"
                  ? "●"
                  : s.status === "blocked"
                    ? "▲"
                    : s.status === "done"
                      ? "◆"
                      : "○"}{" "}
                {s.spell}
              </Text>
            </Box>
            <Box flexDirection="row" gap={1} alignItems="center">
              <Text color={theme.green}>{makeProgressBar(s.progress)}</Text>
              <Text color={theme.textDim}>{s.progress}%</Text>
              <Text color={theme.textMuted}>{s.assigned_to ?? ""}</Text>
            </Box>
          </Box>
        ))
      : [<Text key="empty" color={theme.textMuted}>No battle plans yet.</Text>];

  return (
    <Box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.bg}
    >
      <Box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        borderStyle="single"
        borderColor={theme.green}
        marginBottom={1}
      >
        <Text bold color={theme.green}>
          // {name} — command deck
        </Text>
        <Text color={theme.textMuted}>
          {personas.length} agent
          {personas.length === 1 ? "" : "s"} ·{" "}
          {activeSpells.length} active spell
          {activeSpells.length === 1 ? "" : "s"}
        </Text>
      </Box>

      <Box
        flexDirection="row"
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        gap={1}
      >
        <Box
          flexDirection="column"
          flexGrow={1}
          flexBasis={0}
          borderStyle="round"
          borderColor={theme.textDim}
          padding={1}
        >
          <Box flexGrow={0}>
            <Select
              options={personas.map((p) => ({
                name: `${p.glyph}  ${p.display_name}`,
                description: p.role,
                value: p,
              }))}
              selectedIndex={selectedIdx}
            />
          </Box>
          <Box overflow="hidden" width="100%" flexGrow={1}>
            {selectedPersona ? (
              <Box flexDirection="column">
                <Text bold color={theme.green}>
                  {selectedPersona.display_name} — {selectedPersona.voice}
                </Text>
                <Text color={theme.textMuted}>
                  {selectedPersona.body.slice(0, 500)}
                </Text>
              </Box>
            ) : (
              <Text color={theme.textMuted}>
                {personas.length === 0
                  ? "No personas installed. Run `hocus init` first."
                  : ""}
              </Text>
            )}
          </Box>
        </Box>

        <Box
          flexDirection="column"
          flexGrow={1}
          flexBasis={0}
          borderStyle="round"
          borderColor={theme.textDim}
          padding={1}
        >
          <Box overflow="hidden" width="100%" flexGrow={1}>
            {spellCards}
          </Box>
        </Box>
      </Box>

      <Box
        flexDirection="row"
        height={1}
        paddingLeft={2}
        paddingRight={2}
        backgroundColor={theme.bgPanel}
      >
        <Text color={theme.textDim}>
          <Text bold>q</Text> quit  <Text bold>↑↓</Text> navigate{" "}
          <Text bold>enter</Text> select
        </Text>
      </Box>
    </Box>
  );
}

export async function runTui({ repoRoot, projectName }: TuiOptions): Promise<void> {
  const { waitUntilExit } = render(
    <App repoRoot={repoRoot} projectName={projectName} />
  );
  await waitUntilExit();
}
