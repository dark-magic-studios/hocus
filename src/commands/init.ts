import path from "node:path";
import fsExtra from "fs-extra";
const { ensureDir, pathExists, readdir, readFile, writeFile } = fsExtra;
import { log } from "../utils/log.js";
import {
  BUNDLED_PERSONAS_DIR,
  BUNDLED_SKILLS_DIR,
  PACKAGE_ROOT,
  PROJECT_PERSONAS_DIR,
  PROJECT_SPELLS_DIR,
} from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";
import { getCompiler } from "../compilers/index.js";
import { writeCompiledFile, installSkill } from "../utils/files.js";
import { readSpells } from "../schema/spell.js";
import { renderDashboard } from "../templates/dashboard.js";

export interface InitOptions {
  repoRoot: string;
  projectName?: string;
}

const TEMPLATE_FILES = ["AGENTS.md", "CLAUDE.md", "PRODUCT.md", "MEMORY.md", "TASKS.md"];

export async function runInit({ repoRoot, projectName }: InitOptions): Promise<void> {
  const name = projectName ?? path.basename(repoRoot);
  log.heading(`initializing aviomancy in ${repoRoot}`);

  // 1. main files — skip anything that already exists, never clobber.
  const templatesDir = path.join(PACKAGE_ROOT, "src", "templates");
  for (const file of TEMPLATE_FILES) {
    const dest = path.join(repoRoot, file);
    if (await pathExists(dest)) {
      log.warn(`${file} already exists, leaving it alone`);
      continue;
    }
    const tmplPath = path.join(templatesDir, `${file}.tmpl`);
    const raw = await readFile(tmplPath, "utf8");
    const filled = raw
      .replaceAll("{{PROJECT_NAME}}", name)
      .replaceAll("{{DATE}}", new Date().toISOString().slice(0, 10));
    await writeFile(dest, filled, "utf8");
    log.ok(`wrote ${file}`);
  }

  // 2. _spells/
  const spellsDir = PROJECT_SPELLS_DIR(repoRoot);
  await ensureDir(spellsDir);
  log.ok("created _spells/");

  // 3. copy the persona cast into the project — editable from here on,
  //    this repo's copy is the source of truth, not the package's bundle.
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  await ensureDir(personasDir);
  const personaFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  let installedCount = 0;
  for (const file of personaFiles) {
    const dest = path.join(personasDir, file);
    if (await pathExists(dest)) continue;
    const content = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
    await writeFile(dest, content, "utf8");
    installedCount++;
  }
  log.ok(`installed ${installedCount} personas to .aviomancy/personas/`);

  // 4. compile Claude Code agents by default. Run `aviomancy cast` for
  //    OpenCode, Cursor, and Antigravity with repo-specific tailoring.
  const compiler = getCompiler("claude-code");
  const souls = (await readdir(personasDir))
    .filter((f) => f.endsWith(".soul.md"))
    .map((f) => parseSoulFile(path.join(personasDir, f)));

  for (const soul of souls) {
    const compiled = compiler.compile(soul, { repoRoot, stack: { languages: [], frameworks: [] } });
    await writeCompiledFile(repoRoot, compiled);
  }
  log.ok(`compiled ${souls.length} agents for Claude Code`);

  // 5. starter skill, mirrored for every tool that reads .agents/skills/
  //    or .claude/skills/ — no compiling needed, the format is shared.
  await installSkill(path.join(BUNDLED_SKILLS_DIR, "example-skill"), repoRoot, "example-skill");
  log.ok("installed example-skill to .claude/skills/ and .agents/skills/");

  // 6. initial dashboard
  const spells = await readSpells(spellsDir);
  const html = renderDashboard({ projectName: name, personas: souls, spells });
  await writeFile(path.join(repoRoot, "dashboard.html"), html, "utf8");
  log.ok("wrote dashboard.html");

  log.heading("done — run `aviomancy cast` once you're ready to target OpenCode, Cursor, or Antigravity too.");
}
