import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readdir } = fsExtra;
import { PROJECT_PERSONAS_DIR, PROJECT_SKILLS_DIR } from "./paths.js";
import { ALL_COMPILERS } from "../compilers/index.js";
import { OPENCODE_AGENT_DIR } from "../compilers/opencode.js";

export interface TargetStatus {
  target: string;
  label: string;
  detected: boolean;
  compiledCount: number;
}

export interface HocusStatus {
  installed: boolean;
  agentCount: number;
  skillCount: number;
  isUpToDate: boolean;
  statusMessage: string;
  targets: TargetStatus[];
}

const WARD_AGENT_DIR: Record<string, string> = {
  "claude-code": path.join(".claude", "agents"),
  opencode: path.join(".opencode", OPENCODE_AGENT_DIR),
  cursor: path.join(".cursor", "rules"),
  antigravity: path.join(".agents", "rules"),
};

export async function getHocusStatus(repoRoot: string): Promise<HocusStatus> {
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const personasExist = await pathExists(personasDir);

  const personaFiles = personasExist
    ? (await readdir(personasDir).catch(() => [])).filter((f) => f.endsWith(".soul.md"))
    : [];

  const agentCount = personaFiles.length;
  const installed = personasExist && agentCount > 0;

  // Count skills installed in .agents/skills, .agents/plugins/*/skills, and legacy .claude/skills
  const skillNames = new Set<string>();
  const agentsSkillsDir = path.join(repoRoot, ".agents", "skills");
  const pluginsDir = path.join(repoRoot, ".agents", "plugins");
  const claudeSkillsDir = path.join(repoRoot, ".claude", "skills");

  const agentsSkills = (await readdir(agentsSkillsDir).catch(() => [] as string[])).filter((f) => !f.startsWith("."));
  for (const s of agentsSkills) skillNames.add(s);

  if (await pathExists(pluginsDir)) {
    const plugins = (await readdir(pluginsDir).catch(() => [] as string[])).filter((f) => !f.startsWith("."));
    for (const plugin of plugins) {
      const pSkillsDir = path.join(pluginsDir, plugin, "skills");
      if (await pathExists(pSkillsDir)) {
        const pSkills = (await readdir(pSkillsDir).catch(() => [] as string[])).filter((f) => !f.startsWith("."));
        for (const s of pSkills) skillNames.add(s);
      }
    }
  }

  const claudeSkills = (await readdir(claudeSkillsDir).catch(() => [] as string[])).filter((f) => !f.startsWith("."));
  for (const s of claudeSkills) skillNames.add(s);

  const skillCount = skillNames.size;

  const dashboardExists = await pathExists(path.join(repoRoot, "dashboard.html"));

  const targets: TargetStatus[] = await Promise.all(
    ALL_COMPILERS.map(async (compiler) => {
      const detected = await compiler.detect(repoRoot);
      const relDir = WARD_AGENT_DIR[compiler.id];
      let compiledCount = 0;
      if (detected && relDir) {
        const fullDir = path.join(repoRoot, relDir);
        const files = await readdir(fullDir).catch(() => [] as string[]);
        compiledCount = files.filter((f) => f.endsWith(".md") || f.endsWith(".mdc")).length;
      }
      return {
        target: compiler.id,
        label: compiler.label,
        detected,
        compiledCount,
      };
    })
  );

  let isUpToDate = false;
  let statusMessage = "";

  if (!installed) {
    statusMessage = "Not installed (run hocus init)";
  } else if (!dashboardExists) {
    statusMessage = "Out-of-date (dashboard.html missing - run hocus sync)";
  } else {
    const detectedTargets = targets.filter((t) => t.detected);
    const underCompiled = detectedTargets.filter((t) => t.compiledCount < agentCount);
    if (detectedTargets.length > 0 && underCompiled.length > 0) {
      statusMessage = "Out-of-date (uncompiled agents - run hocus cast)";
    } else {
      isUpToDate = true;
      statusMessage = "Up-to-date";
    }
  }

  return {
    installed,
    agentCount,
    skillCount,
    isUpToDate,
    statusMessage,
    targets,
  };
}
