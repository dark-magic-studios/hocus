import React, { useState } from "react";
import { Box, Text, useInput, useApp, render } from "ink";
import type { SoulFile } from "../../schema/soul.js";
import type { AgentGroup } from "../../utils/absorb.js";
import { palette } from "../theme.js";

export interface AbsorbPromptProps {
  targetPersona: SoulFile;
  availablePersonas: SoulFile[]; // other personas in the project
  agentGroups: AgentGroup[];
  onConfirm: (assignments: Record<string, string>) => void;
  onCancel: () => void;
  isActive?: boolean;
}

export const AbsorbPrompt: React.FC<AbsorbPromptProps> = ({
  targetPersona,
  availablePersonas,
  agentGroups,
  onConfirm,
  onCancel,
  isActive = true,
}) => {
  const defaultReplacement = availablePersonas[0]?.character ?? "";

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const ag of agentGroups) {
      init[ag.id] = defaultReplacement;
    }
    return init;
  });

  // Items to focus: 0..agentGroups.length - 1 are agents.
  // agentGroups.length is [ Absorb ]
  // agentGroups.length + 1 is [ Cancel ]
  const totalFocusable = agentGroups.length + 2;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cyclePersona = (agentId: string, delta: number) => {
    if (availablePersonas.length === 0) return;
    const currentSlug = assignments[agentId] || defaultReplacement;
    const currentIdx = Math.max(
      0,
      availablePersonas.findIndex((p) => p.character === currentSlug),
    );
    const nextIdx =
      (currentIdx + delta + availablePersonas.length) % availablePersonas.length;
    const nextSlug = availablePersonas[nextIdx]?.character;
    if (nextSlug) {
      setAssignments((prev) => ({
        ...prev,
        [agentId]: nextSlug,
      }));
    }
  };

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape || (input === "q" && selectedIndex >= agentGroups.length)) {
        onCancel();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalFocusable - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < totalFocusable - 1 ? prev + 1 : 0));
      } else if (key.leftArrow) {
        if (selectedIndex < agentGroups.length) {
          const agent = agentGroups[selectedIndex];
          if (agent) cyclePersona(agent.id, -1);
        } else if (selectedIndex === agentGroups.length + 1) {
          setSelectedIndex(agentGroups.length);
        }
      } else if (key.rightArrow) {
        if (selectedIndex < agentGroups.length) {
          const agent = agentGroups[selectedIndex];
          if (agent) cyclePersona(agent.id, 1);
        } else if (selectedIndex === agentGroups.length) {
          setSelectedIndex(agentGroups.length + 1);
        }
      } else if (key.return) {
        if (selectedIndex === agentGroups.length) {
          onConfirm(assignments);
        } else if (selectedIndex === agentGroups.length + 1) {
          onCancel();
        } else {
          // Pressing enter on an agent moves to the next row
          setSelectedIndex((prev) => Math.min(prev + 1, agentGroups.length));
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" paddingY={1} paddingX={1} borderStyle="single" borderColor={palette.violet}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={palette.violet}>
          Absorb Persona: {targetPersona.display_name} ({targetPersona.character})
        </Text>
        <Text color={palette.dim}>
          Removing this persona will migrate its assigned agents to a replacement persona.
        </Text>
      </Box>

      {agentGroups.length === 0 ? (
        <Box flexDirection="column" marginY={1}>
          <Text color={palette.amber}>
            No existing agents currently target &quot;{targetPersona.character}&quot;.
          </Text>
          <Text color={palette.dim}>
            Proceeding will remove {targetPersona.character}.soul.md from .hocus/personas/.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          <Text color={palette.violet} bold>
            Detected agents using {targetPersona.display_name}:
          </Text>
          {agentGroups.map((agent, index) => {
            const isFocused = index === selectedIndex;
            const replacementSlug = assignments[agent.id] || defaultReplacement;
            const replacementSoul = availablePersonas.find(
              (p) => p.character === replacementSlug,
            );
            const replacementName = replacementSoul
              ? `${replacementSoul.display_name} (${replacementSoul.character})`
              : replacementSlug;

            const providerLabels = Array.from(
              new Set(agent.files.map((f) => f.provider)),
            ).join(", ");

            return (
              <Box key={agent.id} marginY={0}>
                <Text color={isFocused ? palette.green : palette.dim}>
                  {isFocused ? "▸ " : "  "}
                </Text>
                <Text color={palette.text} bold={isFocused}>
                  {agent.id.padEnd(20)}
                </Text>
                <Text color={palette.dim}>[{providerLabels}] </Text>
                <Text color={palette.text}> → </Text>
                <Text color={isFocused ? palette.green : palette.greenDim} bold={isFocused}>
                  ◀ {replacementName} ▶
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Action buttons */}
      <Box marginTop={1} gap={2}>
        <Text
          color={
            selectedIndex === agentGroups.length
              ? palette.green
              : palette.dim
          }
          bold={selectedIndex === agentGroups.length}
        >
          {selectedIndex === agentGroups.length ? "▸ [ Absorb ]" : "  [ Absorb ]"}
        </Text>
        <Text
          color={
            selectedIndex === agentGroups.length + 1
              ? palette.amber
              : palette.dim
          }
          bold={selectedIndex === agentGroups.length + 1}
        >
          {selectedIndex === agentGroups.length + 1 ? "▸ [ Cancel ]" : "  [ Cancel ]"}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>
          (↑/↓: navigate · ←/→: change replacement persona · Enter: select/confirm · Esc: cancel)
        </Text>
      </Box>
    </Box>
  );
};

export async function promptAbsorb(
  targetPersona: SoulFile,
  availablePersonas: SoulFile[],
  agentGroups: AgentGroup[],
): Promise<Record<string, string> | null> {
  if (!process.stdout.isTTY) {
    const fallback = availablePersonas[0]?.character ?? "";
    const res: Record<string, string> = {};
    for (const ag of agentGroups) {
      res[ag.id] = fallback;
    }
    return res;
  }

  let result: Record<string, string> | null = null;
  const { waitUntilExit } = render(
    <AbsorbPrompt
      targetPersona={targetPersona}
      availablePersonas={availablePersonas}
      agentGroups={agentGroups}
      onConfirm={(assignments) => {
        result = assignments;
      }}
      onCancel={() => {
        result = null;
      }}
    />,
  );

  await waitUntilExit();
  return result;
}
