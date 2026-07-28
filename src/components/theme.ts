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
