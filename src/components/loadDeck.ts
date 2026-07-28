import type { DeckData } from './types.js';

/**
 * Reads the on-disk state the TUI renders.
 *
 * TODO(DMS): wire each section to the real source:
 *   agents  -> .hocus/personas/**\/SOUL.md   (parse frontmatter, build tier tree from `parent:`)
 *   spells  -> _spells/*.md                  (reuse the lenient spell parser)
 *   skills  -> .hocus/skills/**\/SKILL.md    (mirrored, not compiled)
 *   wards   -> detectStack() + compiler target probes
 *   ledger  -> .hocus/ledger.jsonl           (append-only, tail last N)
 *
 * Until then this returns an empty deck so every tab renders its empty state.
 */
export async function loadDeck(_cwd: string): Promise<DeckData> {
  return { agents: [], spells: [], skills: [], wards: [], ledger: [] };
}
