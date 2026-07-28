import path from 'node:path';
import fsExtra from 'fs-extra';
const { pathExists, readFile } = fsExtra;
import type { Skill } from '../state/types.js';

const MAX_FILE_CHARS = 4000;

export interface ResolvedPrompt {
  prompt: string;
  notes: string[];
}

/**
 * Expands a chat message's `/skill` and `@file` mentions into the literal
 * text sent to the backend CLI — a leading `/name` pulls in that skill's
 * SKILL.md body as instructions, and any `@path` token pulls in that file's
 * contents. Never throws: an unknown skill or missing file downgrades to a
 * note instead of blocking the send.
 */
export async function resolvePrompt(raw: string, cwd: string, skills: Skill[]): Promise<ResolvedPrompt> {
  const notes: string[] = [];
  let text = raw;
  let header = '';

  const skillMatch = text.match(/^\/(\S+)\s*/);
  if (skillMatch) {
    const token = skillMatch[1]!;
    const skill = skills.find(
      (s) => s.id === token || s.name.toLowerCase() === token.toLowerCase(),
    );
    if (skill) {
      const body = await readFile(skill.path, 'utf8').catch(() => '');
      header += `--- skill: ${skill.name} (${skill.path}) ---\n${body}\n--- end skill ---\n\n`;
      notes.push(`invoked skill "${skill.name}"`);
      text = text.slice(skillMatch[0].length);
    } else {
      notes.push(`unknown skill "/${token}" — sending literally`);
    }
  }

  const cwdReal = path.resolve(cwd);
  const fileTokens = [...text.matchAll(/@(\S+)/g)].map((m) => m[1]!);
  let filesBlock = '';
  for (const token of fileTokens) {
    const full = path.resolve(cwd, token);
    if (full !== cwdReal && !full.startsWith(cwdReal + path.sep)) {
      notes.push(`refused to read "${token}" — outside project root`);
      continue;
    }
    if (!(await pathExists(full))) {
      notes.push(`file not found: ${token}`);
      continue;
    }
    const content = await readFile(full, 'utf8').catch(() => undefined);
    if (content === undefined) {
      notes.push(`could not read: ${token}`);
      continue;
    }
    const truncated = content.length > MAX_FILE_CHARS
      ? `${content.slice(0, MAX_FILE_CHARS)}\n… (truncated)`
      : content;
    filesBlock += `--- file: ${token} ---\n${truncated}\n--- end file ---\n\n`;
  }

  const prompt = `${header}${filesBlock}${text}`.trim();
  return { prompt, notes };
}
