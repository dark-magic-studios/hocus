import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, writeFile, stat, ensureDir, copy } = fsExtra;
import matter from "gray-matter";
import type { TargetId } from "../compilers/types.js";
import { parseSoulFile, type SoulFile } from "../schema/soul.js";
import {
  PROJECT_PERSONAS_DIR,
  PROJECT_SOULS_DIR,
  BUNDLED_PERSONAS_DIR,
} from "./paths.js";

export interface DetectedSubagent {
  id: string; // e.g. "custom-orchestrator"
  displayName: string;
  filePath: string; // absolute path
  relPath: string; // repo-relative path, e.g. ".cursor/agents/orchestrator.md"
  provider: TargetId | "generic";
  currentSoul?: string; // soul character slug if already affixed
  currentSoulPath?: string; // e.g. ".hocus/souls/jared.soul.md"
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
    filePath: string;
    relPath: string;
    soul: string;
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
 * Ensures .hocus/souls/ (and .hocus/personas/) exists and returns all available SoulFile definitions.
 * If .hocus/souls/ does not exist, syncs or initializes from .hocus/personas/ or bundled personas.
 */
export async function findAvailableSouls(repoRoot: string): Promise<SoulFile[]> {
  const soulsDir = PROJECT_SOULS_DIR(repoRoot);
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);

  await ensureDir(soulsDir);
  await ensureDir(personasDir);

  let soulsFiles = (await readdir(soulsDir).catch(() => [])).filter((f) => f.endsWith(".soul.md") || f.endsWith(".md"));
  let personasFiles = (await readdir(personasDir).catch(() => [])).filter((f) => f.endsWith(".soul.md") || f.endsWith(".md"));

  // If personas exist but soulsDir is empty, copy personas to soulsDir
  if (!soulsFiles.length && personasFiles.length) {
    for (const pf of personasFiles) {
      await copy(path.join(personasDir, pf), path.join(soulsDir, pf)).catch(() => {});
    }
    soulsFiles = (await readdir(soulsDir).catch(() => [])).filter((f) => f.endsWith(".soul.md") || f.endsWith(".md"));
  }

  // If both empty, copy from bundled personas to both
  if (!soulsFiles.length && (await pathExists(BUNDLED_PERSONAS_DIR))) {
    const bundledFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
    for (const bf of bundledFiles) {
      await copy(path.join(BUNDLED_PERSONAS_DIR, bf), path.join(soulsDir, bf)).catch(() => {});
      await copy(path.join(BUNDLED_PERSONAS_DIR, bf), path.join(personasDir, bf)).catch(() => {});
    }
    soulsFiles = (await readdir(soulsDir).catch(() => [])).filter((f) => f.endsWith(".soul.md") || f.endsWith(".md"));
  }

  const sourceDir = soulsFiles.length ? soulsDir : personasDir;
  const activeFiles = soulsFiles.length ? soulsFiles : personasFiles;

  const souls: SoulFile[] = [];
  for (const file of activeFiles) {
    try {
      const fullPath = path.join(sourceDir, file);
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
 * Detects .hocus/souls/ links, .hocus/personas/ links, and hocus:soul delimiter blocks.
 */
export function extractAffixedSoul(content: string): { soulSlug?: string; soulPath?: string } {
  // 1. Check hocus:soul:start block
  const blockMatch = content.match(
    /<!--\s*hocus:soul:start\s*-->[\s\S]*?<!--\s*hocus:soul:end\s*-->/,
  );
  if (blockMatch) {
    const inner = blockMatch[0];
    const match =
      inner.match(/\.hocus\/(?:souls|personas)\/([a-zA-Z0-9_-]+)(?:\.soul)?\.md/) ||
      inner.match(/<!--\s*soul:\s*([^\s>]+)\s*-->/);
    if (match && match[1]) {
      const slug = path.basename(match[1].trim(), ".soul.md").replace(/\.md$/, "");
      return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
    }
  }

  // 2. Check markdown link href pointing to .hocus/souls/ or .hocus/personas/
  const linkHrefMatch = content.match(
    /\[[^\]]*\]\([^)]*?\.hocus\/(?:souls|personas)\/([a-zA-Z0-9_-]+)(?:\.soul)?\.md[^)]*\)/,
  );
  if (linkHrefMatch && linkHrefMatch[1]) {
    const slug = linkHrefMatch[1].trim();
    return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
  }

  // 3. Check markdown link text pointing to .hocus/souls/ or .hocus/personas/
  const linkTextMatch = content.match(
    /\[[^\]]*?\.hocus\/(?:souls|personas)\/([a-zA-Z0-9_-]+)(?:\.soul)?\.md[^\]]*\]\([^)]+\)/,
  );
  if (linkTextMatch && linkTextMatch[1]) {
    const slug = linkTextMatch[1].trim();
    return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
  }

  // 4. Check simple <!-- soul: path --> comment
  const commentMatch = content.match(/<!--\s*soul:\s*([^\s>]+)\s*-->/);
  if (commentMatch && commentMatch[1]) {
    const soulPath = commentMatch[1].trim();
    const slug = path.basename(soulPath, ".soul.md").replace(/\.md$/, "");
    return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
  }

  // 5. Check plain text mention: .hocus/souls/<slug>.soul.md
  const textMatch = content.match(/\.hocus\/(?:souls|personas)\/([a-zA-Z0-9_-]+)(?:\.soul)?\.md/);
  if (textMatch && textMatch[1]) {
    const slug = textMatch[1].trim();
    return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
  }

  // 6. Check TOML comment # soul: ...
  const tomlMatch = content.match(/^#\s*soul:\s*([^\s#\n]+)/m);
  if (tomlMatch && tomlMatch[1]) {
    const soulPath = tomlMatch[1].trim();
    const slug = path.basename(soulPath, ".soul.md").replace(/\.md$/, "");
    return { soulSlug: slug, soulPath: `.hocus/souls/${slug}.soul.md` };
  }

  return {};
}

/**
 * Detects all existing custom agents and subagents that the user already has.
 * Returns ONE entry per file.
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
 * Groups detected subagents by their agent identifier (used when grouping is desired).
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
 * References .hocus/souls/${soul.character}.soul.md.
 */
export function buildSoulReferenceBlock(
  agentFilePath: string,
  soul: SoulFile,
  repoRoot: string,
): string {
  const relSoulPath = path.posix.join(".hocus", "souls", `${soul.character}.soul.md`);
  const fullSoulPath = path.join(repoRoot, relSoulPath);
  const relLink = path.posix.normalize(
    path.relative(path.dirname(agentFilePath), fullSoulPath).replace(/\\/g, "/"),
  );

  return [
    "<!-- hocus:soul:start -->",
    `<!-- soul: ${relSoulPath} -->`,
    `> **Soul**: Adopt the persona defined in [${relSoulPath}](${relLink}).`,
    "<!-- hocus:soul:end -->",
  ].join("\n");
}

/**
 * Touches ONLY the specified agent file and adds or replaces the soul reference after frontmatter.
 * Looks for any existing .hocus/souls or .hocus/personas references and cleanly replaces them.
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

  const relSoulPath = path.posix.join(".hocus", "souls", `${soul.character}.soul.md`);

  // Ensure the target soul file exists in .hocus/souls/
  const fullSoulPath = path.join(repoRoot, relSoulPath);
  if (!(await pathExists(fullSoulPath))) {
    await ensureDir(path.dirname(fullSoulPath));
    const personaPath = path.join(repoRoot, ".hocus", "personas", `${soul.character}.soul.md`);
    const bundledPath = path.join(BUNDLED_PERSONAS_DIR, `${soul.character}.soul.md`);
    if (await pathExists(personaPath)) {
      await copy(personaPath, fullSoulPath).catch(() => {});
    } else if (soul.sourcePath && (await pathExists(soul.sourcePath))) {
      await copy(soul.sourcePath, fullSoulPath).catch(() => {});
    } else if (await pathExists(bundledPath)) {
      await copy(bundledPath, fullSoulPath).catch(() => {});
    } else {
      const frontmatter: Record<string, unknown> = {
        character: soul.character,
        display_name: soul.display_name,
        role: soul.role,
        voice: soul.voice,
        glyph: soul.glyph,
        triggers: soul.triggers,
      };
      if (soul.aliases) frontmatter.aliases = soul.aliases;
      const content = matter.stringify(soul.body || "", frontmatter);
      await writeFile(fullSoulPath, content, "utf8");
    }
  }

  if (ext === ".toml") {
    // Codex TOML agent: add/update # soul: comment
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

  // 1. Remove existing soul blocks and legacy soul comments/blockquotes
  if (SOUL_BLOCK_REGEX.test(updated)) {
    updated = updated.replace(SOUL_BLOCK_REGEX, "");
  }
  if (SOUL_LEGACY_COMMENT_REGEX.test(updated)) {
    updated = updated.replace(SOUL_LEGACY_COMMENT_REGEX, "");
  }

  // Also remove standalone blockquotes referencing .hocus/souls or .hocus/personas
  updated = updated.replace(/^>\s*\*\*Soul\*\*:[^\n]*\.hocus\/(?:souls|personas)\/[^\n]*\r?\n?/gm, "");
  updated = updated.replace(/^\[[^\]]*\]\([^)]*?\.hocus\/(?:souls|personas)\/[^)]*\)\r?\n?/gm, "");

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
 * Executes affixing across assigned subagent files.
 * Supports assignments keyed by file relPath, filePath, or agentId.
 */
export async function executeAffix({
  repoRoot,
  assignments,
  availableSouls,
  subagentFiles,
  dryRun = false,
}: {
  repoRoot: string;
  assignments: Record<string, string>; // file relPath or agentId -> soulSlug
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

  for (const file of subagentFiles) {
    // Check if assigned by exact relPath, filePath, or agent id
    const soulSlug =
      assignments[file.relPath] ??
      assignments[file.filePath] ??
      assignments[file.id];

    if (!soulSlug || soulSlug === "none") continue;

    const soul = soulMap.get(soulSlug.toLowerCase());
    if (!soul) continue;

    await affixSoulToFile(file.filePath, soul, repoRoot, dryRun);

    result.affixedAgents.push({
      agentId: file.id,
      filePath: file.filePath,
      relPath: file.relPath,
      soul: soul.character,
    });
  }

  return result;
}
