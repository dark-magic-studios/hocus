import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { z } from "zod";

/**
 * The canonical schema for a SOUL.md file. This is the single source of
 * truth a persona is compiled from — see src/compilers/*.ts for the targets
 * a persona gets translated into.
 *
 * SOUL.md describes identity, not runtime state. Things like "is this agent
 * currently active" belong to whatever orchestration layer runs on top of
 * the compiled output, not to the persona definition itself.
 */
export const SoulAliasesSchema = z.object({
  /** Original Silicon Valley cast name — surfaced via dashboard ?cast=valley */
  valley: z.string().min(1).optional(),
  /** Previous occultist recast name — surfaced via dashboard ?cast=occult */
  occult: z.string().min(1).optional(),
});

export const SoulFrontmatterSchema = z.object({
  character: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "character must be a lowercase, hyphenated slug"),
  display_name: z.string().min(1),
  role: z.string().min(1),
  voice: z.string().min(1),
  glyph: z.string().min(1).max(8).default("[?]"),
  triggers: z.array(z.string()).default([]),
  /** Alternate display names for easter-egg cast views; ignored by compilers */
  aliases: SoulAliasesSchema.optional(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  /** Whether this persona compiles as a subagent (default: true) */
  subagent: z.boolean().optional().default(true),
  /** Slug of the persona that spawned this one, e.g. a coven familiar. */
  parent: z.string().min(1).optional(),
  /** Rank in the command deck's coven view; inferred from `parent` when omitted. */
  tier: z.enum(["archmage", "circle", "coven", "familiar"]).optional(),
  /** Free-text scope note shown alongside a familiar in the coven tree. */
  scope: z.string().optional(),
});

export type SoulFrontmatter = z.infer<typeof SoulFrontmatterSchema>;

export interface SoulFile extends SoulFrontmatter {
  /** Absolute path the SOUL.md was read from. */
  sourcePath: string;
  /** The markdown body — the persona's instructions, sans frontmatter. */
  body: string;
}

export class SoulValidationError extends Error {
  constructor(public readonly file: string, public readonly issues: z.ZodIssue[]) {
    const formatted = issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    super(`Invalid SOUL.md: ${file}\n${formatted}`);
    this.name = "SoulValidationError";
  }
}

/**
 * Reject malformed SOUL.md files on schema grounds before any compiler ever
 * touches them.
 */
export function parseSoulFile(path: string): SoulFile {
  const raw = readFileSync(path, "utf8");
  const { data, content } = matter(raw);

  const result = SoulFrontmatterSchema.safeParse(data);
  if (!result.success) {
    throw new SoulValidationError(path, result.error.issues);
  }

  return {
    ...result.data,
    sourcePath: path,
    body: content.trim(),
  };
}
