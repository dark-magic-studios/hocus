import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput, render } from "ink";
import type { TargetId } from "../../compilers/types.js";
import type { Cast } from "../../utils/cast.js";
import {
  ALL_PROVIDERS,
  PLUGIN_PROVIDERS,
  PROVIDER_RUNNERS,
  type HarnessFormat,
  describeLayout,
  hasPluginProvider,
} from "../../utils/harness.js";
import { palette } from "../theme.js";

export interface InitWizardAnswers {
  cast: Cast;
  providers: TargetId[];
  format: HarnessFormat;
  symlinks: boolean;
  runner: string;
}

export type InitWizardStep = "cast" | "providers" | "format" | "symlinks" | "runner" | "summary";

export interface InitWizardProps {
  initial: InitWizardAnswers;
  /** Steps answered by CLI flags; they are skipped. */
  locked?: Partial<Record<Exclude<InitWizardStep, "summary">, boolean>>;
  /** Providers found in the repo, tagged in the provider list. */
  detected?: TargetId[];
  pluginName: string;
  onDone: (answers: InitWizardAnswers) => void;
  onCancel: () => void;
}

interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

const CAST_CHOICES: Choice<Cast>[] = [
  { value: "wizard", label: "Wizards", hint: "Merlin, Roger Bacon, Zoroaster, Flamel… (/merlin-draft-potion)" },
  { value: "valley", label: "Silicon Valley", hint: "Richard, Jared, Gilfoyle, Dinesh… (/richard-draft-potion)" },
];

const FORMAT_CHOICES: Choice<HarnessFormat>[] = [
  {
    value: "plugin",
    label: "Plugin",
    hint: "one bundle in .agents/plugins/<name>/ with Claude Code, Cursor and Antigravity manifests",
  },
  { value: "solo", label: "Solo", hint: "files go straight into .claude/, .cursor/, .agents/…" },
];

const SYMLINK_CHOICES: Choice<boolean>[] = [
  { value: true, label: "Yes, symlink", hint: ".agents/ stays the single source of truth; provider dirs link to it" },
  { value: false, label: "No, copy", hint: "each provider dir gets its own copy (safest on Windows)" },
];

const RUNNER_LABELS: Record<string, string> = {
  claude: "Claude Code (claude)",
  codex: "Codex (codex)",
  opencode: "OpenCode (opencode)",
  agent: "Cursor (agent)",
  agy: "Antigravity (agy)",
  copilot: "GitHub Copilot (copilot)",
};

export function runnerChoices(providers: TargetId[]): string[] {
  const runners = providers.map((p) => PROVIDER_RUNNERS[p]).filter((r): r is string => Boolean(r));
  return Array.from(new Set(runners));
}

export function wizardSteps(answers: InitWizardAnswers, locked: InitWizardProps["locked"] = {}): InitWizardStep[] {
  const steps: InitWizardStep[] = [];
  if (!locked.cast) steps.push("cast");
  if (!locked.providers) steps.push("providers");
  if (!locked.format && hasPluginProvider(answers.providers)) steps.push("format");
  if (!locked.symlinks) steps.push("symlinks");
  if (!locked.runner && runnerChoices(answers.providers).length > 1) steps.push("runner");
  steps.push("summary");
  return steps;
}

export const InitWizard: React.FC<InitWizardProps> = ({
  initial,
  locked = {},
  detected = [],
  pluginName,
  onDone,
  onCancel,
}) => {
  const { exit } = useApp();
  const [answers, setAnswers] = useState<InitWizardAnswers>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(() => wizardSteps(answers, locked), [answers, locked]);
  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const runners = runnerChoices(answers.providers);

  const optionCount = (() => {
    switch (step) {
      case "cast":
        return CAST_CHOICES.length;
      case "providers":
        return ALL_PROVIDERS.length;
      case "format":
        return FORMAT_CHOICES.length;
      case "symlinks":
        return SYMLINK_CHOICES.length;
      case "runner":
        return runners.length;
      case "summary":
        return 0;
    }
  })();

  // Park the cursor on the current answer whenever the step changes.
  useEffect(() => {
    setError(null);
    switch (step) {
      case "cast":
        setCursor(Math.max(0, CAST_CHOICES.findIndex((c) => c.value === answers.cast)));
        break;
      case "format":
        setCursor(Math.max(0, FORMAT_CHOICES.findIndex((c) => c.value === answers.format)));
        break;
      case "symlinks":
        setCursor(Math.max(0, SYMLINK_CHOICES.findIndex((c) => c.value === answers.symlinks)));
        break;
      case "runner":
        setCursor(Math.max(0, runners.indexOf(answers.runner)));
        break;
      default:
        setCursor(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = (patch: Partial<InitWizardAnswers> = {}) => {
    const updated = { ...answers, ...patch };
    // Keep the runner valid for the chosen providers unless a flag pinned it.
    const available = runnerChoices(updated.providers);
    if (!locked.runner && available.length && !available.includes(updated.runner)) {
      updated.runner = available[0]!;
    }
    setAnswers(updated);
    setStepIndex((i) => i + 1);
  };

  const back = () => {
    if (stepIndex === 0) {
      onCancel();
      exit();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  useInput((input, key) => {
    if (key.escape) {
      back();
      return;
    }
    if (key.upArrow && optionCount) {
      setCursor((c) => (c > 0 ? c - 1 : optionCount - 1));
      return;
    }
    if (key.downArrow && optionCount) {
      setCursor((c) => (c < optionCount - 1 ? c + 1 : 0));
      return;
    }

    if (step === "providers" && input === " ") {
      const id = ALL_PROVIDERS[cursor]!.id;
      setError(null);
      setAnswers((prev) => ({
        ...prev,
        providers: prev.providers.includes(id)
          ? prev.providers.filter((p) => p !== id)
          : ALL_PROVIDERS.map((p) => p.id).filter((p) => p === id || prev.providers.includes(p)),
      }));
      return;
    }

    if (!key.return) return;
    switch (step) {
      case "cast":
        next({ cast: CAST_CHOICES[cursor]!.value });
        break;
      case "providers":
        if (answers.providers.length === 0) {
          setError("select at least one provider");
          return;
        }
        next();
        break;
      case "format":
        next({ format: FORMAT_CHOICES[cursor]!.value });
        break;
      case "symlinks":
        next({ symlinks: SYMLINK_CHOICES[cursor]!.value });
        break;
      case "runner":
        next({ runner: runners[cursor]! });
        break;
      case "summary":
        onDone(answers);
        exit();
        break;
    }
  });

  const title = (() => {
    switch (step) {
      case "cast":
        return "Which naming convention should the cast use?";
      case "providers":
        return "Which providers should hocus set up?";
      case "format":
        return "Install Claude Code / Cursor / Antigravity as a plugin or solo?";
      case "symlinks":
        return "Symlink provider files to .agents/?";
      case "runner":
        return "Which agent should run the founder session?";
      case "summary":
        return "Ready to cast";
    }
  })();

  const renderSingle = <T,>(choices: Choice<T>[]) =>
    choices.map((choice, index) => {
      const focused = index === cursor;
      return (
        <Box key={String(choice.value)} flexDirection="column">
          <Text color={focused ? palette.green : palette.text}>
            {focused ? "› " : "  "}
            {choice.label}
          </Text>
          {choice.hint ? <Text color={palette.dim}>{"    "}{choice.hint}</Text> : null}
        </Box>
      );
    });

  const body = (() => {
    switch (step) {
      case "cast":
        return renderSingle(CAST_CHOICES);
      case "format":
        return renderSingle(FORMAT_CHOICES);
      case "symlinks":
        return renderSingle(SYMLINK_CHOICES);
      case "runner":
        return renderSingle(runners.map((r) => ({ value: r, label: RUNNER_LABELS[r] ?? r })));
      case "providers":
        return ALL_PROVIDERS.map((provider, index) => {
          const focused = index === cursor;
          const checked = answers.providers.includes(provider.id);
          const tags = [
            PLUGIN_PROVIDERS.includes(provider.id) ? "plugin-capable" : null,
            detected.includes(provider.id) ? "detected" : null,
          ].filter(Boolean);
          return (
            <Box key={provider.id}>
              <Text color={focused ? palette.green : palette.dim}>{focused ? "› " : "  "}</Text>
              <Text color={checked ? palette.green : palette.muted}>
                {checked ? "[x]" : "[ ]"} {provider.label}
              </Text>
              <Text color={palette.dim}>
                {"  "}
                {provider.dir}
                {tags.length ? ` · ${tags.join(" · ")}` : ""}
              </Text>
            </Box>
          );
        });
      case "summary": {
        const format = hasPluginProvider(answers.providers) ? answers.format : "solo";
        const layout = describeLayout({ ...answers, format, pluginName });
        return (
          <Box flexDirection="column">
            <Text>
              <Text color={palette.muted}>cast      </Text>
              {CAST_CHOICES.find((c) => c.value === answers.cast)?.label}
            </Text>
            <Text>
              <Text color={palette.muted}>providers </Text>
              {answers.providers.map((p) => ALL_PROVIDERS.find((a) => a.id === p)?.label ?? p).join(", ")}
            </Text>
            <Text>
              <Text color={palette.muted}>format    </Text>
              {format}
            </Text>
            <Text>
              <Text color={palette.muted}>symlinks  </Text>
              {answers.symlinks ? "yes" : "no (copies)"}
            </Text>
            <Text>
              <Text color={palette.muted}>runner    </Text>
              {RUNNER_LABELS[answers.runner] ?? answers.runner}
            </Text>
            <Box flexDirection="column" marginTop={1}>
              {layout.map((line) => (
                <Text key={line} color={palette.dim}>
                  · {line}
                </Text>
              ))}
            </Box>
          </Box>
        );
      }
    }
  })();

  const hint =
    step === "providers"
      ? "↑/↓ move · Space toggle · Enter next · Esc back"
      : step === "summary"
        ? "Enter install · Esc back"
        : `↑/↓ move · Enter select · Esc ${stepIndex === 0 ? "cancel" : "back"}`;

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={palette.violet}>
        hocus init · step {Math.min(stepIndex, steps.length - 1) + 1}/{steps.length}
      </Text>
      <Text bold color={palette.green}>
        {title}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {body}
      </Box>
      {error ? <Text color={palette.red}>{error}</Text> : null}
      <Box marginTop={1}>
        <Text color={palette.dim}>{hint}</Text>
      </Box>
    </Box>
  );
};

/** Runs the wizard in the terminal. Resolves null when the user cancels. */
export async function promptInitWizard(
  props: Omit<InitWizardProps, "onDone" | "onCancel">,
): Promise<InitWizardAnswers | null> {
  let result: InitWizardAnswers | null = null;
  const { waitUntilExit } = render(
    <InitWizard
      {...props}
      onDone={(answers) => {
        result = answers;
      }}
      onCancel={() => {
        result = null;
      }}
    />,
  );
  await waitUntilExit();
  return result;
}
