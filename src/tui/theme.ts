export const palette = {
  green: '#00ff66',
  greenDim: '#0a8f47',
  violet: '#8b5cf6',
  amber: '#ffb454',
  red: '#ff5d5d',
  text: '#e8e8e3',
  muted: '#8a8a8a',
  dim: '#56595a',
} as const;

export type AgentStatus = 'active' | 'reviewing' | 'blocked' | 'idle';

export const statusColor: Record<AgentStatus, string> = {
  active: palette.green,
  reviewing: palette.violet,
  blocked: palette.amber,
  idle: palette.dim,
};

export const glyphs = {
  unicode: {
    active: '●', reviewing: '◐', blocked: '▲', idle: '○',
    archmage: '▲', circle: '✦', coven: '☾', familiar: '▸',
    bullet: '·', barFull: '█', barEmpty: '░', spark: '✦',
  },
  ascii: {
    active: '*', reviewing: '%', blocked: '!', idle: 'o',
    archmage: '^', circle: '+', coven: '~', familiar: '>',
    bullet: '-', barFull: '#', barEmpty: '.', spark: '*',
  },
} as const;

export type GlyphSet = typeof glyphs.unicode;

export type BrandMarkColor = 'green' | 'violet';

export interface BrandMarkRow {
  text: string;
  color: BrandMarkColor;
}

/** Rotated-H lockup: violet asterisk, green bars, mono HOCUS wordmark. */
export function getBrandMark(unicode: boolean): BrandMarkRow[] {
  const bar = unicode ? '█' : '#';
  const star = unicode ? '✦' : '*';
  const wide = bar.repeat(16);
  const stem = bar.repeat(3);
  return [
    { text: `       ${star}`, color: 'violet' },
    { text: ` ${wide}`, color: 'green' },
    { text: `       ${stem}`, color: 'green' },
    { text: ` ${wide}`, color: 'green' },
    { text: '      HOCUS', color: 'green' },
  ];
}

// Legacy export kept for any direct row iteration; prefer getBrandMark().
export const BRAND_MARK = getBrandMark(true).map((row) => row.text);
