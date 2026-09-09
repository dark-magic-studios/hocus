import matter from "gray-matter";

export type Cast = "valley" | "wizard";

/**
 * Normalizes user input into a Cast. Accepts 'valley', 'wizard',
 * 'wizards', 'silicon', 'silicon valley', 'occult' (legacy) — case-insensitive.
 */
export function normalizeCast(input: string): Cast | undefined {
  const n = input.trim().toLowerCase();
  if (n === "valley" || n === "silicon valley" || n === "silicon" || n === "sv") return "valley";
  if (n === "wizard" || n === "wizards" || n === "occult" || n === "hocus" || n === "mystic") return "wizard";
  return undefined;
}

// Valley slug -> { valleyDisplay, wizardDisplay, wizardSlug }
export const CAST_MAP: Record<
  string,
  { valleyDisplay: string; wizardDisplay: string; wizardSlug: string }
> = {
  "big-head": { valleyDisplay: "Big Head", wizardDisplay: "Baba Yaga", wizardSlug: "baba-yaga" },
  dinesh: { valleyDisplay: "Dinesh", wizardDisplay: "Flamel", wizardSlug: "flamel" },
  erlich: { valleyDisplay: "Erlich", wizardDisplay: "Circe", wizardSlug: "circe" },
  gavin: { valleyDisplay: "Gavin", wizardDisplay: "The Apprentice", wizardSlug: "the-apprentice" },
  gilfoyle: { valleyDisplay: "Gilfoyle", wizardDisplay: "Zoroaster", wizardSlug: "zoroaster" },
  jared: { valleyDisplay: "Jared", wizardDisplay: "Roger Bacon", wizardSlug: "roger-bacon" },
  "jian-yang": { valleyDisplay: "Jian-Yang", wizardDisplay: "Cagliostro", wizardSlug: "cagliostro" },
  laurie: { valleyDisplay: "Laurie", wizardDisplay: "John Dee", wizardSlug: "john-dee" },
  monica: { valleyDisplay: "Monica", wizardDisplay: "Nostradamus", wizardSlug: "nostradamus" },
  "peter-gregory": { valleyDisplay: "Peter Gregory", wizardDisplay: "Midas", wizardSlug: "midas" },
  "dan-melcher": {
    valleyDisplay: "Dan Melcher",
    wizardDisplay: "Chronos",
    wizardSlug: "chronos",
  },
  richard: { valleyDisplay: "Richard", wizardDisplay: "Merlin", wizardSlug: "merlin" },
  russ: { valleyDisplay: "Russ Hanneman", wizardDisplay: "Prospero", wizardSlug: "prospero" },
};

/** Mapping from canonical base agent slug to valley persona slug */
export const BASE_AGENT_TO_VALLEY: Record<string, string> = {
  "dumb-qa": "big-head",
  "feature-dev": "dinesh",
  "product-strategist": "erlich",
  "ceremony-master": "gavin",
  "reviewer": "gilfoyle",
  "orchestrator": "jared",
  "qa": "jian-yang",
  "configurator": "laurie",
  "recruiter": "monica",
  "founder": "peter-gregory",
  "project-manager": "dan-melcher",
  "planner": "richard",
  "costs-cleaner": "russ",
};

export const VALLEY_TO_BASE_AGENT: Record<string, string> = Object.fromEntries(
  Object.entries(BASE_AGENT_TO_VALLEY).map(([k, v]) => [v, k]),
);

// Skill-id prefix mapping: valley skill prefix (as it appears in skill folder)
// -> valleySlug (key of CAST_MAP). Handles hyphen variants like bighead vs big-head.
const SKILL_PREFIX_TO_VALLEY: Record<string, string> = {
  "bighead": "big-head",
  "baba-yaga": "big-head",
  "dumb-qa": "big-head",
  "dinesh": "dinesh",
  "flamel": "dinesh",
  "feature-dev": "dinesh",
  "erlich": "erlich",
  "circe": "erlich",
  "gavin": "gavin",
  "the-apprentice": "gavin",
  "apprentice": "gavin",
  "gilfoyle": "gilfoyle",
  "zoroaster": "gilfoyle",
  "jared": "jared",
  "roger-bacon": "jared",
  "alcuin": "jared",
  "jianyang": "jian-yang",
  "jian-yang": "jian-yang",
  "cagliostro": "jian-yang",
  "laurie": "laurie",
  "john-dee": "laurie",
  "dee": "laurie",
  "monica": "monica",
  "nostradamus": "monica",
  "peter": "peter-gregory",
  "peter-gregory": "peter-gregory",
  "midas": "peter-gregory",
  "richard": "richard",
  "merlin": "richard",
  "russ": "russ",
  "prospero": "russ",
  "dan-melcher": "dan-melcher",
  "melcher": "dan-melcher",
  "dan": "dan-melcher",
  "chronos": "dan-melcher",
  "cornelius-agrippa": "dan-melcher",
  "project-manager": "dan-melcher",
};

// Skills that are persona-specific and should be renamed when cast switches.
// Generic skills (atomic-commits, graphify, etc.) are not renamed.
export const PERSONA_SKILL_IDS = new Set([
  "bighead-dumb-test",
  "dinesh-pr-feedback",
  "dinesh-pr-open",
  "erlich-changelog",
  "erlich-readme",
  "erlich-update-product",
  "gavin-render-dashboard",
  "gilfoyle-codebase-review",
  "gilfoyle-pr-review",
  "jared-orchestrate",
  "jianyang-smart-test",
  "laurie-fix-conflict",
  "laurie-resolve-config",
  "peter-invoke",
  "richard-draft-potion",
  "russ-token-trim",
]);

function _slugifyDisplay(display: string): string {
  return display
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
const slugifyDisplay = _slugifyDisplay;

function replacePrefix(skillId: string, newPrefix: string): string {
  const idx = skillId.indexOf("-");
  if (idx === -1) return newPrefix;
  return `${newPrefix}${skillId.slice(idx)}`;
}

function detectValleySlugFromSkillId(skillId: string): string | undefined {
  // Longest-prefix match to handle multi-segment prefixes like peter-gregory, the-apprentice, etc.
  const sorted = Object.keys(SKILL_PREFIX_TO_VALLEY).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (skillId === prefix || skillId.startsWith(`${prefix}-`) || skillId.startsWith(`${prefix}-`)) {
      return SKILL_PREFIX_TO_VALLEY[prefix];
    }
  }
  return undefined;
}

export function getSkillIdForCast(skillId: string, cast: Cast): string {
  if (!PERSONA_SKILL_IDS.has(skillId)) {
    // Also handle wizard already-renamed ids when switching back
    const wizardVariants = new Set(
      Array.from(PERSONA_SKILL_IDS).map((id) => getSkillIdForCast(id, "wizard")),
    );
    if (cast === "valley" && wizardVariants.has(skillId)) {
      // Will be handled via reverse mapping below
    } else {
      return skillId;
    }
  }

  const valleySlug = detectValleySlugFromSkillId(skillId);
  if (!valleySlug) return skillId;

  const entry = CAST_MAP[valleySlug];
  if (!entry) return skillId;

  if (cast === "valley") return replacePrefix(skillId, valleySlug.replace(/-/g, "") === "bighead" ? "bighead" : valleySlug === "jian-yang" ? "jianyang" : valleySlug === "peter-gregory" ? "peter" : valleySlug);
  // wizard
  const wizardPrefixMap: Record<string, string> = {
    "big-head": "baba-yaga",
    "dinesh": "flamel",
    "erlich": "circe",
    "gavin": "the-apprentice",
    "gilfoyle": "zoroaster",
    "jared": "roger-bacon",
    "jian-yang": "cagliostro",
    "laurie": "john-dee",
    "monica": "nostradamus",
    "peter-gregory": "midas",
    "dan-melcher": "chronos",
    "project-manager": "chronos",
    "richard": "merlin",
    "russ": "prospero",
  };
  const wizardPrefix = wizardPrefixMap[valleySlug];
  if (!wizardPrefix) return skillId;
  return replacePrefix(skillId, wizardPrefix);
}

// Reverse: given a possibly wizard skill id, map to valley id for detection
function getValleySkillId(skillId: string): string {
  const valleySlug = detectValleySlugFromSkillId(skillId);
  if (!valleySlug) return skillId;
  // valley canonical skill ids are the keys in PERSONA_SKILL_IDS
  // Find the one that has same suffix as skillId after prefix
  const suffix = skillId.includes("-") ? skillId.slice(skillId.indexOf("-")) : "";
  for (const valleyId of PERSONA_SKILL_IDS) {
    const vSlug = detectValleySlugFromSkillId(valleyId);
    if (vSlug === valleySlug && valleyId.endsWith(suffix)) return valleyId;
  }
  return skillId;
}

export function transformSkillFrontmatterForCast(rawContent: string, cast: Cast): string {
  const { data, content } = matter(rawContent);
  const originalName = typeof data.name === "string" ? data.name : "";
  const originalDesc = typeof data.description === "string" ? data.description : "";

  let newName = originalName;
  let newDesc = originalDesc;

  if (originalName) {
    // Map through valley->wizard translation via detection
    const valleyId = getValleySkillId(originalName);
    if (PERSONA_SKILL_IDS.has(valleyId)) {
      newName = getSkillIdForCast(valleyId, cast);
    } else {
      // direct prefix translation for already-wizard names when switching to valley
      const valleySlug = detectValleySlugFromSkillId(originalName);
      if (valleySlug) {
        const entry = CAST_MAP[valleySlug];
        if (entry) {
          const suffix = originalName.includes("-") ? originalName.slice(originalName.indexOf("-")) : `-${originalName}`;
          if (cast === "valley") {
            const valleyPrefix =
              valleySlug === "big-head"
                ? "bighead"
                : valleySlug === "jian-yang"
                  ? "jianyang"
                  : valleySlug === "peter-gregory"
                    ? "peter"
                    : valleySlug;
            newName = valleyPrefix + suffix;
          } else {
            const wizardPrefixMap: Record<string, string> = {
              "big-head": "baba-yaga",
              "dinesh": "flamel",
              "erlich": "circe",
              "gavin": "the-apprentice",
              "gilfoyle": "zoroaster",
              "jared": "roger-bacon",
              "jian-yang": "cagliostro",
              "laurie": "john-dee",
              "peter-gregory": "midas",
              "richard": "merlin",
              "russ": "prospero",
            };
            const wp = wizardPrefixMap[valleySlug];
            if (wp) newName = wp + suffix;
          }
        }
      }
    }
  }

  if (originalDesc) {
    // Description pattern: "<Name> — description"
    // Replace leading name with cast-appropriate display name
    const valleySlug = originalName ? detectValleySlugFromSkillId(originalName) : undefined;
    // Also detect from description's leading token
    let descValleySlug: string | undefined = valleySlug;
    if (!descValleySlug) {
      const firstWord = originalDesc.split(" ")[0]?.toLowerCase().replace(/[^a-z-]/g, "");
      if (firstWord) {
        const byDisplay = Object.entries(CAST_MAP).find(
          ([, v]) =>
            v.valleyDisplay.toLowerCase() === firstWord ||
            v.valleyDisplay.toLowerCase().replace(/[^a-z]/g, "") === firstWord ||
            v.wizardDisplay.toLowerCase() === firstWord,
        );
        if (byDisplay) descValleySlug = byDisplay[0];
      }
    }
    if (descValleySlug && CAST_MAP[descValleySlug]!) {
      const entry = CAST_MAP[descValleySlug]!;
      const targetDisplay = cast === "valley" ? entry.valleyDisplay : entry.wizardDisplay;
      // Replace "<something> —" at start with targetDisplay
      const dashIdx = originalDesc.indexOf("—");
      const hyphenIdx = originalDesc.indexOf(" - ");
      let sepIdx = -1;
      let sep = " —";
      if (dashIdx !== -1 && (hyphenIdx === -1 || dashIdx < hyphenIdx)) {
        sepIdx = dashIdx;
        sep = " —";
      } else if (hyphenIdx !== -1) {
        sepIdx = hyphenIdx;
        sep = " -";
      }
      if (sepIdx !== -1) {
        const rest = originalDesc.slice(sepIdx);
        newDesc = `${targetDisplay} ${rest.trimStart().startsWith("—") || rest.trimStart().startsWith("-") ? rest.trimStart() : rest}`;
        // Ensure "Name — rest" spacing
        if (!newDesc.startsWith(`${targetDisplay} —`) && !newDesc.startsWith(`${targetDisplay} -`)) {
          // fallback: rebuild
          const after = originalDesc.slice(sepIdx).replace(/^[—\-]\s*/, "");
          newDesc = `${targetDisplay} — ${after}`;
        }
      } else {
        // No separator, try to replace first token if it matches valley/wizard display first word
        const valleyFirst = entry.valleyDisplay.split(" ")[0]?.toLowerCase();
        const wizardFirst = entry.wizardDisplay.split(" ")[0]?.toLowerCase();
        const origFirst = originalDesc.split(" ")[0]?.toLowerCase();
        if (origFirst === valleyFirst?.toLowerCase() || origFirst === wizardFirst?.toLowerCase()) {
          newDesc = originalDesc.replace(/^\S+/, targetDisplay);
        }
      }
    }
  }
  // avoid unused variable warning
  void slugifyDisplay;

  if (newName === originalName && newDesc === originalDesc) return rawContent;

  const newData = { ...data };
  if (newName !== originalName) newData.name = newName;
  if (newDesc !== originalDesc) newData.description = newDesc;

  return matter.stringify(content, newData);
}

export function transformSoulForCast(rawContent: string, cast: Cast): string {
  const { data, content } = matter(rawContent);
  const character = typeof data.character === "string" ? data.character : "";
  // Find valleySlug key that matches base agent, character (or via aliases)
  let valleySlug: string | undefined = BASE_AGENT_TO_VALLEY[character];
  if (!valleySlug && CAST_MAP[character]) {
    valleySlug = character;
  } else if (!valleySlug) {
    // Check if character is already a wizard slug
    valleySlug = Object.entries(CAST_MAP).find(([, v]) => v.wizardSlug === character)?.[0];
    if (!valleySlug) {
      // Try slugified display_name reverse lookup
      const disp = typeof data.display_name === "string" ? data.display_name : "";
      valleySlug = Object.entries(CAST_MAP).find(
        ([, v]) => v.valleyDisplay === disp || v.wizardDisplay === disp,
      )?.[0];
    }
  }
  // Also try aliases to resolve
  if (!valleySlug && data.aliases) {
    const a = data.aliases as { valley?: string; occult?: string };
    if (a.valley) {
      valleySlug = Object.entries(CAST_MAP).find(([, v]) => v.valleyDisplay === a.valley)?.[0];
    }
    if (!valleySlug && a.occult) {
      valleySlug = Object.entries(CAST_MAP).find(([, v]) => v.wizardDisplay === a.occult)?.[0];
    }
  }

  if (!valleySlug || !CAST_MAP[valleySlug]!) return rawContent;

  const entry = CAST_MAP[valleySlug]!;
  const targetCharacter = cast === "valley" ? valleySlug : entry.wizardSlug;
  const targetDisplay = cast === "valley" ? entry.valleyDisplay : entry.wizardDisplay;

  const newData: Record<string, unknown> = { ...data, character: targetCharacter, display_name: targetDisplay };

  // Ensure aliases keep both options for dashboard toggle
  newData.aliases = {
    valley: entry.valleyDisplay,
    occult: entry.wizardDisplay,
  };

  // Update heading in body if it starts with "# <OldName> —" or clean "# <Display>"
  let newContent = content;
  const headingMatch = content.match(/^#\s+(.+?)(?:\s+—\s*(.*))?$/m);
  if (headingMatch) {
    const oldHeadingName = headingMatch[1]?.trim();
    const oldSuffix = headingMatch[2]?.trim();
    if (
      oldHeadingName === entry.valleyDisplay ||
      oldHeadingName === entry.wizardDisplay ||
      oldHeadingName === data.display_name ||
      oldHeadingName === data.character
    ) {
      const suffix = oldSuffix ? ` — ${oldSuffix}` : data.role ? ` — ${data.role}` : "";
      newContent = content.replace(/^#\s+.+$/m, `# ${targetDisplay}${suffix}`);
    }
  }

  return matter.stringify(newContent, newData);
}

export function getSoulFilenameForCast(valleySlugOrBase: string, cast: Cast): string {
  const valleySlug = BASE_AGENT_TO_VALLEY[valleySlugOrBase] ?? valleySlugOrBase;
  const entry = CAST_MAP[valleySlug];
  if (!entry) return `${valleySlugOrBase}.soul.md`;
  return cast === "valley" ? `${valleySlug}.soul.md` : `${entry.wizardSlug}.soul.md`;
}

export function describeCast(cast: Cast): string {
  return cast === "valley"
    ? "Silicon Valley (Richard, Jared, Gilfoyle...)"
    : "Wizards (Merlin, Roger Bacon, Zoroaster...)";
}
