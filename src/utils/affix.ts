import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, writeFile, stat, ensureDir, copy } = fsExtra;
import matter from "gray-matter";
import type { TargetId } from "../compilers/types.js";
import { parseSoulFile, type SoulFile } from "../schema/soul.js";
import {
  PROJECT_PERSONAS_DIR,
  BUNDLED_PERSONAS_DIR,
} from "./paths.js";

export interface DetectedSubagent {
  id: string; // e.g. "custom-orchestrator"
  displayName: string;
  filePath: string; // absolute path
  relPath: string; // repo-relative path, e.g. ".cursor/agents/orchestrator.md"
  provider: TargetId | "generic";
  currentSoul?: string; // soul character slug if already affixed
  currentSoulPath?: string; // e.g. ".hocus/personas/jared.soul.md"
}

export interface SubagentGroup {
  id: string; // e.g. "orchestrator"
  displayName: string;
  files: DetectedSubagent[];
  currentSoul?: string;
}

export interface AffixResult {
  affixedAgents: {
    agentId: string;
    soul: string;
    filesUpdated: string[];
  }[];
}

const KNOWN_AGENT_SCAN_DIRS: { dir: string; provider: TargetId | "generic" }[] = [
  { dir: path.join(".claude", "agents"), provider: "claude-code" },
  { dir: path.join(".cursor", "agents"), provider: "cursor" },
  { dir: path.join(".opencode", "agent"), provider: "opencode" },
  { dir: path.join(".opencode", "agents"), provider: "opencode" },
  { dir: path.join(".agents", "agents"), provider: "antigravity" },
  { dir: path.join(".commandcode", "agents"), provider: "command-code" },
  { dir: path.join(".github", "agents"), provider: "copilot" },
  { dir: path.join(".codex", "agents"), provider: "codex" },
];

export const SOUL_BLOCK_REGEX = /<!--\s*hocus:soul:start\s*-->[\s\S]*?<!--\s*hocus:soul:end\s*-->\r?\n?/g;
export const SOUL_LEGACY_COMMENT_REGEX = /<!--\s*soul:\s*([^\s>]+)\s*-->\r?\n?(?:>[^\n]*\r?\n?)*/g;

/**
 * Ensures .hocus/personas/ exists and returns all available SoulFile definitions.
 * If .hocus/personas/ does not exist or is empty, initializes it from bundled personas.
 */
export async function findAvailableSouls(repoRoot: string): Promise<SoulFile[]> {
  const dir = PROJECT_PERSONAS_DIR(repoRoot);
  if (!(await pathExists(dir))) {
    await ensureDir(dir);
  }

  let files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".soul.md"));

  if (!files.length && (await pathExists(BUNDLED_PERSONAS_DIR))) {
    const bundledFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
    for (const bf of bundledFiles) {
      await copy(path.join(BUNDLED_PERSONAS_DIR, bf), path.join(dir, bf));
    }
    files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".soul.md"));
  }

  const souls: SoulFile[] = [];
  for (const file of files) {
    try {
      const fullPath = path.join(dir, file);
      const soul = parseSoulFile(fullPath);
      souls.push(soul);
    } catch {
      // Ignore malformed files
    }
  }

  return souls;
}

/**
 * Resolves user input (e.g. "jared", "Jared", "Roger Bacon") to a known soul slug.
 */
export function resolveSoulSlug(input: string, availableSouls: SoulFile[]): string | undefined {
  const norm = input.trim().toLowerCase();
  for (const soul of availableSouls) {
    if (soul.character.toLowerCase() === norm) return soul.character;
    if (soul.display_name.toLowerCase() === norm) return soul.character;
    if (soul.aliases?.valley?.toLowerCase() === norm) return soul.character;
    if (soul.aliases?.occult?.toLowerCase() === norm) return soul.character;
  }
  return undefined;
}

/**
 * Extracts currently affixed soul slug and path from file content.
 */
export function extractAffixedSoul(content: string): { soulSlug?: string; soulPath?: string } {
  // Check hocus:soul:start block
  const blockMatch = content.match(/<!--\s*hocus:soul:start\s*-->[\s\S]*?<!--\s*soul:\s*([^\s>]+)\s*-->[\s\S]*?<!--\s*hocus:soul:end\s*-->/);
  if (blockMatch && blockMatch[1]) {
    const soulPath = blockMatch[1].trim();
    const slug = path.basename(soulPath, ".soul.md");
    return { soulSlug: slug, soulPath };
  }

  // Check simple <!-- soul: path --> comment
  const simpleMatch = content.match(/<!--\s*soul:\s*([^\s>]+)\s*-->/);
  if (simpleMatch && simpleMatch[1]) {
    const soulPath = simpleMatch[1].trim();
    const slug = path.basename(soulPath, ".soul.md");
    return { soulSlug: slug, soulPath };
  }

  // Check TOML # soul: path comment
  const tomlMatch = content.match(/^#\s*soul:\s*([^\s#\n]+)/m);
  if (tomlMatch && tomlMatch[1]) {
    const soulPath = tomlMatch[1].trim();
    const slug = path.basename(soulPath, ".soul.md");
    return { soulSlug: slug, soulPath };
  }

  return {};
}

/**
 * Detects all existing custom agents and subagents that the user already has.
 */
export async function findExistingSubagents(repoRoot: string): Promise<DetectedSubagent[]> {
  const results: DetectedSubagent[] = [];

  for (const { dir: relDir, provider } of KNOWN_AGENT_SCAN_DIRS) {
    const fullDir = path.join(repoRoot, relDir);
    if (!(await pathExists(fullDir))) continue;

    const entries = await readdir(fullDir).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(fullDir, entry);
      const fileStat = await stat(fullPath).catch(() => null);
      if (!fileStat) continue;

      if (fileStat.isDirectory()) {
        // Handle nested agent definitions like .agents/agents/<name>/agent.md
        const nestedFile = path.join(fullPath, "agent.md");
        if (await pathExists(nestedFile)) {
          const match = await inspectSubagentFile(
            nestedFile,
            path.relative(repoRoot, nestedFile),
            provider,
            entry,
          );
          if (match) results.push(match);
        }
        continue;
      }

      if (
        !entry.endsWith(".md") &&
        !entry.endsWith(".toml")
      ) {
        continue;
      }

      const agentId = entry
        .replace(/\.agent\.md$/, "")
        .replace(/\.(md|toml)$/, "");

      const match = await inspectSubagentFile(
        fullPath,
        path.relative(repoRoot, fullPath),
        provider,
        agentId,
      );
      if (match) results.push(match);
    }
  }

  return results;
}

async function inspectSubagentFile(
  fullPath: string,
  relPath: string,
  provider: TargetId | "generic",
  inferredId: string,
): Promise<DetectedSubagent | null> {
  const ext = path.extname(fullPath);

  if (ext === ".toml") {
    const content = await readFile(fullPath, "utf8").catch(() => "");
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m);
    const { soulSlug, soulPath } = extractAffixedSoul(content);

    return {
      id: inferredId,
      displayName: nameMatch?.[1] || inferredId,
      filePath: fullPath,
      relPath,
      provider,
      currentSoul: soulSlug,
      currentSoulPath: soulPath,
    };
  }

  try {
    const raw = await readFile(fullPath, "utf8");
    const { data: fm } = matter(raw);
    const { soulSlug, soulPath } = extractAffixedSoul(raw);

    const displayName = (fm.display_name as string) || (fm.name as string) || inferredId;

    return {
      id: inferredId,
      displayName,
      filePath: fullPath,
      relPath,
      provider,
      currentSoul: soulSlug,
      currentSoulPath: soulPath,
    };
  } catch {
    return null;
  }
}

/**
 * Groups detected subagents by their agent identifier.
 */
export function groupSubagents(subagents: DetectedSubagent[]): SubagentGroup[] {
  const groupsMap = new Map<string, SubagentGroup>();

  for (const sa of subagents) {
    const existing = groupsMap.get(sa.id);
    if (existing) {
      existing.files.push(sa);
      if (!existing.currentSoul && sa.currentSoul) {
        existing.currentSoul = sa.currentSoul;
      }
    } else {
      groupsMap.set(sa.id, {
        id: sa.id,
        displayName: sa.displayName || sa.id,
        files: [sa],
        currentSoul: sa.currentSoul,
      });
    }
  }

  return Array.from(groupsMap.values());
}

/**
 * Builds the soul reference block to insert after frontmatter.
 */
export function buildSoulReferenceBlock(
  agentFilePath: string,
  soul: SoulFile,
  repoRoot: string,
): string {
  const relSoulPath = path.posix.join(".hocus", "personas", `${soul.character}.soul.md`);
  const fullSoulPath = path.join(repoRoot, relSoulPath);
  const relLink = path.posix.normalize(
    path.relative(path.dirname(agentFilePath), fullSoulPath).replace(/\\/g, "/"),
  );

  return [
    "<!-- hocus:soul:start -->",
    `<!-- soul: ${relSoulPath} -->`,
    `> **Soul**: Adopt the persona and behavioral guidelines defined in [${relSoulPath}](${relLink}).`,
    "<!-- hocus:soul:end -->",
  ].join("\n");
}

/**
 * Touches ONLY the specified agent file and adds or updates the soul reference after frontmatter.
 * Preserves all existing frontmatter and instructions completely untouched.
 */
export async function affixSoulToFile(
  agentFilePath: string,
  soul: SoulFile,
  repoRoot: string,
  dryRun = false,
): Promise<{ updated: boolean; previousSoul?: string }> {
  const ext = path.extname(agentFilePath);
  const raw = await readFile(agentFilePath, "utf8");
  const { soulSlug: previousSoul } = extractAffixedSoul(raw);

  if (ext === ".toml") {
    // Codex TOML agent: add/update # soul: comment
    const relSoulPath = path.posix.join(".hocus", "personas", `${soul.character}.soul.md`);
    let updated = raw;
    if (/^#\s*soul:.*$/m.test(updated)) {
      updated = updated.replace(/^#\s*soul:.*$/m, `# soul: ${relSoulPath}`);
    } else {
      updated = `# soul: ${relSoulPath}\n` + updated;
    }

    if (!dryRun) {
      await writeFile(agentFilePath, updated, "utf8");
    }
    return { updated: true, previousSoul };
  }

  // Markdown agent file
  const refBlock = buildSoulReferenceBlock(agentFilePath, soul, repoRoot);

  let updated = raw;

  // 1. If an existing soul block or comment exists, remove it first
  if (SOUL_BLOCK_REGEX.test(updated)) {
    updated = updated.replace(SOUL_BLOCK_REGEX, "");
  } else if (SOUL_LEGACY_COMMENT_REGEX.test(updated)) {
    updated = updated.replace(SOUL_LEGACY_COMMENT_REGEX, "");
  }

  // 2. Insert the reference block immediately after frontmatter
  const frontmatterMatch = updated.match(/^(---\r?\n[\s\S]*?\r?\n---)(\r?\n|$)/);

  if (frontmatterMatch && frontmatterMatch[1]) {
    const fmEndIndex = frontmatterMatch[1].length;
    const before = updated.slice(0, fmEndIndex);
    const after = updated.slice(fmEndIndex).trimStart();
    updated = `${before}\n\n${refBlock}\n\n${after}`;
  } else {
    // No frontmatter: prepend to the top of the file
    updated = `${refBlock}\n\n${updated.trimStart()}`;
  }

  if (!dryRun) {
    await writeFile(agentFilePath, updated, "utf8");
  }

  return { updated: true, previousSoul };
}

/**
 * Executes affixing across assigned subagents.
 */
export async function executeAffix({
  repoRoot,
  assignments,
  availableSouls,
  subagentFiles,
  dryRun = false,
}: {
  repoRoot: string;
  assignments: Record<string, string>; // agentId -> soulSlug
  availableSouls: SoulFile[];
  subagentFiles: DetectedSubagent[];
  dryRun?: boolean;
}): Promise<AffixResult> {
  const result: AffixResult = {
    affixedAgents: [],
  };

  const soulMap = new Map<string, SoulFile>();
  for (const soul of availableSouls) {
    soulMap.set(soul.character.toLowerCase(), soul);
  }

  for (const [agentId, soulSlug] of Object.entries(assignments)) {
    if (!soulSlug || soulSlug === "none") continue;

    const soul = soulMap.get(soulSlug.toLowerCase());
    if (!soul) continue;

    // Find all files matching this agentId
    const matchingFiles = subagentFiles.filter(
      (f) => f.id === agentId || f.filePath === agentId || f.relPath === agentId,
    );

    const filesUpdated: string[] = [];
    for (const file of matchingFiles) {
      await affixSoulToFile(file.filePath, soul, repoRoot, dryRun);
      filesUpdated.push(file.relPath);
    }

    if (filesUpdated.length > 0) {
      result.affixedAgents.push({
        agentId,
        soul: soul.character,
        filesUpdated,
      });
    }
  }

  return result;
}
