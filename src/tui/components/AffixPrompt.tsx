import React, { useState } from "react";
import { Box, Text, useInput, useApp, render } from "ink";
import type { SoulFile } from "../../schema/soul.js";
import type { DetectedSubagent } from "../../utils/affix.js";
import { palette } from "../theme.js";

export interface AffixPromptProps {
  availableSouls: SoulFile[];
  subagentFiles: DetectedSubagent[]; // ONE entry per file
  onConfirm: (assignments: Record<string, string>) => void;
  onCancel: () => void;
  isActive?: boolean;
}

const MAX_VISIBLE_ROWS = 10;

export const AffixPrompt: React.FC<AffixPromptProps> = ({
  availableSouls,
  subagentFiles,
  onConfirm,
  onCancel,
  isActive = true,
}) => {
  const { exit } = useApp();

  // Option list for cycling: "none" followed by all available souls
  const soulOptions = ["none", ...availableSouls.map((s) => s.character)];

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of subagentFiles) {
      // Default to current soul if already affixed, or "none"
      init[f.relPath] = f.currentSoul || "none";
    }
    return init;
  });

  // Focus indices: 0..subagentFiles.length - 1 are individual files
  // subagentFiles.length is [ Affix Souls ]
  // subagentFiles.length + 1 is [ Cancel ]
  const totalFocusable = subagentFiles.length + 2;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cycleSoul = (fileKey: string, delta: number) => {
    if (soulOptions.length === 0) return;
    const currentSlug = assignments[fileKey] || "none";
    const currentIdx = Math.max(0, soulOptions.indexOf(currentSlug));
    const nextIdx = (currentIdx + delta + soulOptions.length) % soulOptions.length;
    const nextSlug = soulOptions[nextIdx] ?? "none";
    setAssignments((prev) => ({
      ...prev,
      [fileKey]: nextSlug,
    }));
  };

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape || (input === "q" && selectedIndex >= subagentFiles.length)) {
        onCancel();
        exit();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalFocusable - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < totalFocusable - 1 ? prev + 1 : 0));
      } else if (key.leftArrow) {
        if (selectedIndex < subagentFiles.length) {
          const f = subagentFiles[selectedIndex];
          if (f) cycleSoul(f.relPath, -1);
        } else if (selectedIndex === subagentFiles.length + 1) {
          setSelectedIndex(subagentFiles.length);
        }
      } else if (key.rightArrow) {
        if (selectedIndex < subagentFiles.length) {
          const f = subagentFiles[selectedIndex];
          if (f) cycleSoul(f.relPath, 1);
        } else if (selectedIndex === subagentFiles.length) {
          setSelectedIndex(subagentFiles.length + 1);
        }
      } else if (key.return) {
        if (selectedIndex === subagentFiles.length) {
          onConfirm(assignments);
          exit();
        } else if (selectedIndex === subagentFiles.length + 1) {
          onCancel();
          exit();
        } else {
          // Pressing enter on a file row advances focus to next row
          setSelectedIndex((prev) => Math.min(prev + 1, subagentFiles.length));
        }
      }
    },
    { isActive },
  );

  // Compute scroll window if list exceeds MAX_VISIBLE_ROWS
  const totalFiles = subagentFiles.length;
  let startIndex = 0;
  if (totalFiles > MAX_VISIBLE_ROWS) {
    startIndex = Math.min(
      Math.max(0, selectedIndex - Math.floor(MAX_VISIBLE_ROWS / 2)),
      totalFiles - MAX_VISIBLE_ROWS,
    );
  }
  const visibleFiles = subagentFiles.slice(startIndex, startIndex + MAX_VISIBLE_ROWS);

  return (
    <Box flexDirection="column" paddingY={1} paddingX={1} borderStyle="single" borderColor={palette.violet}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={palette.violet}>
          Affix Hocus Souls to Subagents
        </Text>
        <Text color={palette.dim}>
          Select a soul personality (.hocus/souls/) to affix to each detected agent file.
        </Text>
      </Box>

      {subagentFiles.length === 0 ? (
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
            Detected Agent Files (1 entry per file):
          </Text>

          {startIndex > 0 && (
            <Text color={palette.dim}>
              ▲ ({startIndex} more above)
            </Text>
          )}

          {visibleFiles.map((file, offset) => {
            const actualIndex = startIndex + offset;
            const isFocused = actualIndex === selectedIndex;
            const chosenSlug = assignments[file.relPath] || "none";
            const chosenSoul = availableSouls.find((s) => s.character === chosenSlug);
            const soulLabel = chosenSoul
              ? `${chosenSoul.display_name} (${chosenSoul.character})`
              : "— none (skip) —";

            return (
              <Box key={file.relPath} marginY={0}>
                <Text color={isFocused ? palette.green : palette.dim}>
                  {isFocused ? "▸ " : "  "}
                </Text>
                <Text color={palette.text} bold={isFocused}>
                  {file.relPath.padEnd(38)}
                </Text>
                <Text color={palette.dim}>[{file.provider.padEnd(11)}] </Text>
                <Text color={palette.text}> → </Text>
                <Text color={isFocused ? palette.green : palette.greenDim} bold={isFocused}>
                  ◀ {soulLabel} ▶
                </Text>
              </Box>
            );
          })}

          {startIndex + MAX_VISIBLE_ROWS < totalFiles && (
            <Text color={palette.dim}>
              ▼ ({totalFiles - (startIndex + MAX_VISIBLE_ROWS)} more below)
            </Text>
          )}
        </Box>
      )}

      {/* Action buttons */}
      <Box marginTop={1} gap={2}>
        <Text
          color={
            selectedIndex === subagentFiles.length
              ? palette.green
              : palette.dim
          }
          bold={selectedIndex === subagentFiles.length}
        >
          {selectedIndex === subagentFiles.length ? "▸ [ Affix Souls ]" : "  [ Affix Souls ]"}
        </Text>
        <Text
          color={
            selectedIndex === subagentFiles.length + 1
              ? palette.amber
              : palette.dim
          }
          bold={selectedIndex === subagentFiles.length + 1}
        >
          {selectedIndex === subagentFiles.length + 1 ? "▸ [ Cancel ]" : "  [ Cancel ]"}
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
  subagentFiles: DetectedSubagent[],
): Promise<Record<string, string> | null> {
  if (!process.stdout.isTTY) {
    const res: Record<string, string> = {};
    for (const f of subagentFiles) {
      res[f.relPath] = f.currentSoul || "none";
    }
    return res;
  }

  let result: Record<string, string> | null = null;
  const { waitUntilExit } = render(
    <AffixPrompt
      availableSouls={availableSouls}
      subagentFiles={subagentFiles}
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
