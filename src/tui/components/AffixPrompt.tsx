import React, { useState } from "react";
import { Box, Text, useInput, render } from "ink";
import type { SoulFile } from "../../schema/soul.js";
import type { SubagentGroup } from "../../utils/affix.js";
import { palette } from "../theme.js";

export interface AffixPromptProps {
  availableSouls: SoulFile[];
  subagents: SubagentGroup[];
  onConfirm: (assignments: Record<string, string>) => void;
  onCancel: () => void;
  isActive?: boolean;
}

export const AffixPrompt: React.FC<AffixPromptProps> = ({
  availableSouls,
  subagents,
  onConfirm,
  onCancel,
  isActive = true,
}) => {
  // Option list for cycling: "none" followed by all available souls
  const soulOptions = ["none", ...availableSouls.map((s) => s.character)];

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sa of subagents) {
      // Default to current soul if already affixed, or "none"
      init[sa.id] = sa.currentSoul || "none";
    }
    return init;
  });

  // Focus indices: 0..subagents.length - 1 are subagents
  // subagents.length is [ Affix Souls ]
  // subagents.length + 1 is [ Cancel ]
  const totalFocusable = subagents.length + 2;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cycleSoul = (agentId: string, delta: number) => {
    if (soulOptions.length === 0) return;
    const currentSlug = assignments[agentId] || "none";
    const currentIdx = Math.max(
      0,
      soulOptions.indexOf(currentSlug),
    );
    const nextIdx =
      (currentIdx + delta + soulOptions.length) % soulOptions.length;
    const nextSlug = soulOptions[nextIdx] ?? "none";
    setAssignments((prev) => ({
      ...prev,
      [agentId]: nextSlug,
    }));
  };

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape || (input === "q" && selectedIndex >= subagents.length)) {
        onCancel();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalFocusable - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < totalFocusable - 1 ? prev + 1 : 0));
      } else if (key.leftArrow) {
        if (selectedIndex < subagents.length) {
          const sa = subagents[selectedIndex];
          if (sa) cycleSoul(sa.id, -1);
        } else if (selectedIndex === subagents.length + 1) {
          setSelectedIndex(subagents.length);
        }
      } else if (key.rightArrow) {
        if (selectedIndex < subagents.length) {
          const sa = subagents[selectedIndex];
          if (sa) cycleSoul(sa.id, 1);
        } else if (selectedIndex === subagents.length) {
          setSelectedIndex(subagents.length + 1);
        }
      } else if (key.return) {
        if (selectedIndex === subagents.length) {
          onConfirm(assignments);
        } else if (selectedIndex === subagents.length + 1) {
          onCancel();
        } else {
          // Pressing enter on an agent row advances to next row
          setSelectedIndex((prev) => Math.min(prev + 1, subagents.length));
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" paddingY={1} paddingX={1} borderStyle="single" borderColor={palette.violet}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={palette.violet}>
          Affix Hocus Souls to Subagents
        </Text>
        <Text color={palette.dim}>
          Select a soul personality (.hocus/personas/) to affix to each detected agent or subagent.
        </Text>
      </Box>

      {subagents.length === 0 ? (
        <Box flexDirection="column" marginY={1}>
          <Text color={palette.amber}>
            No custom agents or subagents detected in this project.
          </Text>
          <Text color={palette.dim}>
            Create an agent in .claude/agents/, .cursor/agents/, .agents/agents/, etc. first.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          <Text color={palette.violet} bold>
            Detected Agents &amp; Subagents:
          </Text>
          {subagents.map((sa, index) => {
            const isFocused = index === selectedIndex;
            const chosenSlug = assignments[sa.id] || "none";
            const chosenSoul = availableSouls.find((s) => s.character === chosenSlug);
            const soulLabel = chosenSoul
              ? `${chosenSoul.display_name} (${chosenSoul.character})`
              : "— none (skip) —";

            const providerLabels = Array.from(
              new Set(sa.files.map((f) => f.provider)),
            ).join(", ");

            return (
              <Box key={sa.id} marginY={0}>
                <Text color={isFocused ? palette.green : palette.dim}>
                  {isFocused ? "▸ " : "  "}
                </Text>
                <Text color={palette.text} bold={isFocused}>
                  {sa.id.padEnd(24)}
                </Text>
                <Text color={palette.dim}>[{providerLabels.padEnd(12)}] </Text>
                <Text color={palette.text}> → </Text>
                <Text color={isFocused ? palette.green : palette.greenDim} bold={isFocused}>
                  ◀ {soulLabel} ▶
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
            selectedIndex === subagents.length
              ? palette.green
              : palette.dim
          }
          bold={selectedIndex === subagents.length}
        >
          {selectedIndex === subagents.length ? "▸ [ Affix Souls ]" : "  [ Affix Souls ]"}
        </Text>
        <Text
          color={
            selectedIndex === subagents.length + 1
              ? palette.amber
              : palette.dim
          }
          bold={selectedIndex === subagents.length + 1}
        >
          {selectedIndex === subagents.length + 1 ? "▸ [ Cancel ]" : "  [ Cancel ]"}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>
          (↑/↓: navigate · ←/→: cycle soul · Enter: select/confirm · Esc: cancel)
        </Text>
      </Box>
    </Box>
  );
};

export async function promptAffix(
  availableSouls: SoulFile[],
  subagents: SubagentGroup[],
): Promise<Record<string, string> | null> {
  if (!process.stdout.isTTY) {
    const res: Record<string, string> = {};
    for (const sa of subagents) {
      res[sa.id] = sa.currentSoul || "none";
    }
    return res;
  }

  let result: Record<string, string> | null = null;
  const { waitUntilExit } = render(
    <AffixPrompt
      availableSouls={availableSouls}
      subagents={subagents}
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
