import React, { useState } from "react";
import { Box, Text, useInput, useApp, render } from "ink";
import type { TargetId } from "../../compilers/types.js";

export interface ProviderOption {
  id: TargetId;
  label: string;
  checked: boolean;
}

export const ALL_PROVIDER_OPTIONS: { id: TargetId; label: string }[] = [
  { id: "claude-code", label: "Claude Code (.claude)" },
  { id: "opencode", label: "OpenCode (.opencode)" },
  { id: "cursor", label: "Cursor (.cursor)" },
  { id: "antigravity", label: "Antigravity (.agents)" },
  { id: "command-code", label: "Command Code (.commandcode)" },
];

export interface ProviderSelectPromptProps {
  onSelect: (selected: TargetId[]) => void;
  initialSelected?: TargetId[];
}

export const ProviderSelectPrompt: React.FC<ProviderSelectPromptProps> = ({
  onSelect,
  initialSelected = ["claude-code", "opencode", "cursor", "antigravity", "command-code"],
}) => {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<ProviderOption[]>(() =>
    ALL_PROVIDER_OPTIONS.map((p) => ({
      ...p,
      checked: initialSelected.includes(p.id),
    }))
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (input === " ") {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === selectedIndex ? { ...item, checked: !item.checked } : item
        )
      );
    } else if (key.return) {
      const selected = items.filter((i) => i.checked).map((i) => i.id);
      onSelect(selected);
      exit();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold color="cyan">
        Select target providers to install to:
      </Text>
      {items.map((item, index) => {
        const isFocused = index === selectedIndex;
        const check = item.checked ? "[x]" : "[ ]";
        return (
          <Box key={item.id}>
            <Text color={isFocused ? "green" : "gray"}>
              {isFocused ? "> " : "  "}
            </Text>
            <Text color={item.checked ? "green" : "dim"}>
              {check} {item.label}
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>
          (Use ↑/↓ arrows to navigate, Space to toggle checkmarks, Enter to confirm)
        </Text>
      </Box>
    </Box>
  );
};

export async function promptProviders(
  initialSelected?: TargetId[]
): Promise<TargetId[]> {
  if (!process.stdout.isTTY) {
    return ALL_PROVIDER_OPTIONS.map((p) => p.id);
  }
  let selected: TargetId[] = [];
  const { waitUntilExit } = render(
    <ProviderSelectPrompt
      onSelect={(res) => {
        selected = res;
      }}
      initialSelected={initialSelected}
    />
  );
  await waitUntilExit();
  return selected;
}
