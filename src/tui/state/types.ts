import type { AgentStatus } from '../theme.js';
import type { HocusStatus } from '../../utils/status.js';

export type Tier = 'archmage' | 'circle' | 'coven' | 'familiar';

export interface Agent {
  id: string;
  name: string;
  role: string;
  tier: Tier;
  status: AgentStatus;
  glyph: string;
  parentId?: string;
  scope?: string;
  soulPath: string;
  aliases?: { valley?: string; occult?: string };
}

export interface Potion {
  id: string;
  name: string;
  aka: string;
  status: 'casting' | 'blocked' | 'queued' | 'sealed';
  progress: number;
  draftedBy: string;
  assignedTo?: string;
  reviewedBy?: string;
  note?: string;
  path: string;
}

export interface Skill {
  id: string;
  name: string;
  source: 'bundled' | 'local' | 'pack';
  enabledFor: string[];
  description: string;
  path: string;
}

export interface Ward {
  target: 'claude-code' | 'codex' | 'opencode' | 'cursor' | 'antigravity' | 'command-code' | 'copilot';
  detected: boolean;
  agentDir?: string;
  note?: string;
}

export interface LedgerEntry {
  at: string;
  agentId: string;
  event: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface SpellItem {
  id: string;
  name: string;
  type: 'incantation' | 'ward' | 'curse';
  description?: string;
  trigger?: string;
  calls?: string;
  severity?: 'hard' | 'soft';
  body: string;
  path: string;
  relPath: string;
}

export interface DeckData {
  agents: Agent[];
  potions: Potion[];
  spells: SpellItem[];
  skills: Skill[];
  wards: Ward[];
  ledger: LedgerEntry[];
  status: HocusStatus;
  warnings: string[];
}
