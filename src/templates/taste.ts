/**
 * Taste compatibility instructions appended to agents compiled for Command Code,
 * based on https://commandcode.ai/docs (taste, custom agents, skills).
 *
 * Taste packages live in `.commandcode/taste/` (project) and `~/.commandcode/taste/`
 * (global): a main `taste.md` plus category packages in `<category>/taste.md`.
 */
export const COMMAND_CODE_TASTE_SECTION = `
## Taste compatibility (Command Code)

You may be running inside Command Code, where the user's learned preferences ("taste") are
stored on disk. Follow these rules:

- Before starting work, read \`.commandcode/taste/taste.md\` — it contains the user's learned
  preferences for this codebase.
- When a category heading references another package (e.g. "See [cli/taste.md]"), also read
  \`.commandcode/taste/<category>/taste.md\`. Check \`~/.commandcode/taste/\` for global
  preferences that apply across the user's projects.
- Treat every taste learning as a requirement, not a suggestion — they describe how this user
  wants code written in this project.
- Never hand-edit files under \`.commandcode/taste/\` or \`~/.commandcode/taste/\` — taste files
  are managed automatically by the learning system.
- When the user states a preference, record it with the \`taste\` tool if it is available to you.
- If no taste files exist, continue normally — taste is optional context.
`.trim();
