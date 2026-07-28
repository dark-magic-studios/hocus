import { useEffect, useState } from 'react';
import fg from 'fast-glob';

const IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.hocus/**'];
const MAX_FILES = 5000;

export interface FileIndex {
  files: string[];
  ready: boolean;
}

/** Repo-relative file listing for the seance tab's @-mention autocomplete. */
export function useFileIndex(cwd: string): FileIndex {
  const [files, setFiles] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fg('**/*', { cwd, dot: false, onlyFiles: true, ignore: IGNORE, suppressErrors: true })
      .then((results) => {
        if (cancelled) return;
        setFiles(results.slice(0, MAX_FILES));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return { files, ready };
}
