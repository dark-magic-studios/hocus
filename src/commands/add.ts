import os from "node:os";
import path from "node:path";
import fsExtra from "fs-extra";
const { ensureDir, copy, writeFile, pathExists, readdir, stat } = fsExtra;
import { log } from "../utils/log.js";
import {
  BUNDLED_PERSONAS_DIR,
  BUNDLED_SKILLS_DIR,
  BUNDLED_RULES_DIR,
  PROJECT_PERSONAS_DIR,
} from "../utils/paths.js";
import { parseSoulFile, type SoulFile } from "../schema/soul.js";
import { getCompiler } from "../compilers/index.js";
import type { TargetId } from "../compilers/types.js";
import { promptProviders } from "../tui/components/ProviderSelectPrompt.js";
import { detectStack } from "../scanners/detect-stack.js";

export interface AddOptions {
  repoRoot?: string;
  agent?: string;
  skill?: string;
  rule?: string;
  local?: boolean;
  global?: boolean;
  providers?: TargetId[];
  from?: string;
  dryRun?: boolean;
  interactive?: boolean;
  overrideHomeDir?: string;
}

export function getAgentTargetPath(
  provider: TargetId,
  soul: SoulFile,
  scope: "local" | "global",
  repoRoot: string,
  homeDir: string = os.homedir()
): string {
  if (scope === "global") {
    switch (provider) {
      case "claude-code":
        return path.join(homeDir, ".claude", "agents", `${soul.character}.md`);
      case "opencode":
        return path.join(homeDir, ".config", "opencode", "agent", `${soul.character}.md`);
      case "cursor":
        return path.join(homeDir, ".cursor", "rules", `${soul.character}.mdc`);
      case "antigravity":
        return path.join(homeDir, ".gemini", "config", "agents", soul.character, "agent.md");
      case "command-code":
        return path.join(homeDir, ".commandcode", "agents", `${soul.character}.md`);
      case "codex":
        return path.join(homeDir, ".codex", "agents", `${soul.character}.toml`);
      case "copilot":
        return path.join(homeDir, ".copilot", "agents", `${soul.character}.agent.md`);
    }
  } else {
    const compiler = getCompiler(provider);
    const compiled = compiler.compile(soul, {
      repoRoot,
      stack: { languages: [], frameworks: [] },
    });
    return path.join(repoRoot, compiled.relPath);
  }
}

export function getSkillTargetPath(
  provider: TargetId,
  skillName: string,
  scope: "local" | "global",
  repoRoot: string,
  homeDir: string = os.homedir()
): string {
  if (scope === "global") {
    switch (provider) {
      case "claude-code":
        return path.join(homeDir, ".claude", "skills", skillName);
      case "opencode":
        return path.join(homeDir, ".config", "opencode", "skills", skillName);
      case "cursor":
        return path.join(homeDir, ".cursor", "skills", skillName);
      case "antigravity":
        return path.join(homeDir, ".gemini", "antigravity", "skills", skillName);
      case "command-code":
        return path.join(homeDir, ".commandcode", "skills", skillName);
      case "codex":
        return path.join(homeDir, ".agents", "skills", skillName);
      case "copilot":
        return path.join(homeDir, ".copilot", "skills", skillName);
    }
  } else {
    switch (provider) {
      case "claude-code":
        return path.join(repoRoot, ".claude", "skills", skillName);
      case "command-code":
        return path.join(repoRoot, ".commandcode", "skills", skillName);
      case "codex":
        return path.join(repoRoot, ".agents", "skills", skillName);
      case "copilot":
        return path.join(repoRoot, ".github", "skills", skillName);
      case "opencode":
      case "cursor":
      case "antigravity":
        return path.join(repoRoot, ".agents", "skills", skillName);
    }
  }
}

export async function findAgentSoul(
  agentId: string,
  repoRoot: string,
  fromPath?: string
): Promise<{ soul: SoulFile; filePath: string } | null> {
  if (fromPath && (await pathExists(fromPath))) {
    try {
      const soul = parseSoulFile(fromPath);
      return { soul, filePath: fromPath };
    } catch {
      // ignore
    }
  }

  const normalized = agentId.endsWith(".soul.md") ? agentId : `${agentId}.soul.md`;
  const candidates = [
    agentId,
    normalized,
    path.join(PROJECT_PERSONAS_DIR(repoRoot), agentId),
    path.join(PROJECT_PERSONAS_DIR(repoRoot), normalized),
    path.join(BUNDLED_PERSONAS_DIR, agentId),
    path.join(BUNDLED_PERSONAS_DIR, normalized),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      try {
        const soul = parseSoulFile(candidate);
        return { soul, filePath: candidate };
      } catch {
        // ignore
      }
    }
  }

  const searchDirs = [PROJECT_PERSONAS_DIR(repoRoot), BUNDLED_PERSONAS_DIR];
  for (const dir of searchDirs) {
    if (!(await pathExists(dir))) continue;
    const files = (await readdir(dir)).filter((f) => f.endsWith(".soul.md"));
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const soul = parseSoulFile(fullPath);
        if (
          soul.character.toLowerCase() === agentId.toLowerCase() ||
          soul.display_name.toLowerCase() === agentId.toLowerCase()
        ) {
          return { soul, filePath: fullPath };
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

export async function findSkillDir(
  skillId: string,
  repoRoot: string,
  fromPath?: string
): Promise<{ skillName: string; sourceDir: string } | null> {
  if (fromPath && (await pathExists(fromPath))) {
    const s = await stat(fromPath);
    if (s.isDirectory()) {
      return { skillName: path.basename(fromPath), sourceDir: fromPath };
    }
  }

  const candidates = [
    skillId,
    path.join(BUNDLED_SKILLS_DIR, skillId),
    path.join(repoRoot, ".agents", "skills", skillId),
    path.join(repoRoot, ".claude", "skills", skillId),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const s = await stat(candidate);
      if (s.isDirectory()) {
        return { skillName: path.basename(candidate), sourceDir: candidate };
      }
    }
  }

  return null;
}

export async function findRuleFiles(
  ruleId: string,
  repoRoot: string,
  fromPath?: string,
): Promise<{ name: string; sourcePath: string }[]> {
  if (fromPath && (await pathExists(fromPath))) {
    const s = await stat(fromPath);
    if (!s.isDirectory()) {
      return [{ name: path.basename(fromPath), sourcePath: fromPath }];
    }
  }

  if (!(await pathExists(BUNDLED_RULES_DIR))) {
    return [];
  }

  const allFiles = (await readdir(BUNDLED_RULES_DIR)).filter((f) => f.endsWith(".md"));
  if (ruleId === "all") {
    return allFiles.map((file) => ({
      name: file,
      sourcePath: path.join(BUNDLED_RULES_DIR, file),
    }));
  }

  const normalized = ruleId.endsWith(".md") ? ruleId : `${ruleId}.md`;
  for (const file of allFiles) {
    if (file.toLowerCase() === normalized.toLowerCase()) {
      return [{ name: file, sourcePath: path.join(BUNDLED_RULES_DIR, file) }];
    }
  }

  return [];
}

export async function runAdd(options: AddOptions): Promise<void> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const homeDir = options.overrideHomeDir ?? os.homedir();
  const dryRun = options.dryRun ?? false;

  if (!options.agent && !options.skill && !options.rule) {
    log.error("Please specify --agent <agent_id>, --skill <skill_id>, or --rule <rule_id>.");
    return;
  }

  const scope: "local" | "global" = options.global ? "global" : "local";

  let selectedProviders: TargetId[] = options.providers ?? [];
  if (!selectedProviders.length) {
    const isInteractive = options.interactive ?? process.stdout.isTTY;
    if (isInteractive) {
      selectedProviders = await promptProviders();
    } else {
      selectedProviders = ["claude-code", "opencode", "cursor", "antigravity", "command-code", "codex", "copilot"];
    }
  }

  if (!selectedProviders.length) {
    log.warn("No providers selected. Aborting installation.");
    return;
  }

  if (options.agent) {
    const agentResult = await findAgentSoul(options.agent, repoRoot, options.from);
    if (!agentResult) {
      log.error(`no agent found matching "${options.agent}"`);
    } else {
      let { soul } = agentResult;
      if (scope === "local") {
        const stack = await detectStack(repoRoot);
        if (stack.languages.length || stack.frameworks.length) {
          const parts = [...stack.languages, ...stack.frameworks].join(", ");
          const pm = stack.packageManager ? ` · package manager: ${stack.packageManager}` : "";
          soul = {
            ...soul,
            body: `${soul.body}\n\n---\n**Repo context:** ${parts}${pm}\n`,
          };
        }
      }

      for (const providerId of selectedProviders) {
        const compiler = getCompiler(providerId);
        const compiled = compiler.compile(soul, {
          repoRoot,
          stack: { languages: [], frameworks: [] },
        });
        const targetPath = getAgentTargetPath(providerId, soul, scope, repoRoot, homeDir);

        if (dryRun) {
          log.planned(path.relative(repoRoot, targetPath), `${compiler.label} (${scope})`);
        } else {
          await ensureDir(path.dirname(targetPath));
          await writeFile(targetPath, compiled.content, "utf8");
          log.ok(`installed agent "${soul.character}" (${compiler.label}, ${scope}) -> ${targetPath}`);
        }
      }
    }
  }

  if (options.skill) {
    const skillResult = await findSkillDir(options.skill, repoRoot, options.from);
    if (!skillResult) {
      log.error(`no skill found matching "${options.skill}"`);
    } else {
      const { skillName, sourceDir } = skillResult;
      const targetDirs = new Set<string>();

      for (const providerId of selectedProviders) {
        const targetDir = getSkillTargetPath(providerId, skillName, scope, repoRoot, homeDir);
        targetDirs.add(targetDir);
      }

      for (const targetDir of targetDirs) {
        if (dryRun) {
          log.planned(path.relative(repoRoot, targetDir), `${skillName} (${scope})`);
        } else {
          await ensureDir(targetDir);
          await copy(sourceDir, targetDir, { overwrite: true });
          log.ok(`installed skill "${skillName}" (${scope}) -> ${targetDir}`);
        }
      }
    }
  }

  if (options.rule) {
    const matchedRules = await findRuleFiles(options.rule, repoRoot, options.from);
    if (!matchedRules.length) {
      log.error(`no rule found matching "${options.rule}"`);
    } else {
      const targetDir =
        scope === "global"
          ? path.join(homeDir, ".gemini", "config", "rules")
          : path.join(repoRoot, ".agents", "rules");

      for (const rule of matchedRules) {
        const dest = path.join(targetDir, rule.name);
        if (dryRun) {
          log.planned(path.relative(repoRoot, dest), `rule (${scope})`);
        } else {
          await ensureDir(targetDir);
          await copy(rule.sourcePath, dest, { overwrite: true });
          log.ok(`installed rule "${rule.name}" (${scope}) -> ${dest}`);
        }
      }
    }
  }
}
