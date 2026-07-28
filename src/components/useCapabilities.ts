import { useMemo } from 'react';
import { glyphs, type GlyphSet } from '../theme.js';

export interface Capabilities {
  unicode: boolean;
  glyph: GlyphSet;
}

function supportsUnicode(): boolean {
  if (process.env.HOCUS_ASCII === '1') return false;
  if (process.platform === 'win32') return Boolean(process.env.WT_SESSION);
  const enc = `${process.env.LC_ALL ?? process.env.LC_CTYPE ?? process.env.LANG ?? ''}`;
  return /UTF-?8$/i.test(enc);
}

export function useCapabilities(): Capabilities {
  return useMemo(() => {
    const unicode = supportsUnicode();
    return { unicode, glyph: (unicode ? glyphs.unicode : glyphs.ascii) as GlyphSet };
  }, []);
}
