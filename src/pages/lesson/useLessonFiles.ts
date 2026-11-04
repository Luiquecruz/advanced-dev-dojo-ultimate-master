import { useCallback, useRef, useState } from 'react';
import type { ProjectFiles } from '@/content';
import { progress } from '@/entities/progress';

/**
 * Editor files of a lesson. Edits are persisted to the progress store outside React state updaters: an updater runs
 * during render when updates queue up, and writing the store there updates every `useProgress` subscriber mid-render.
 */
export function useLessonFiles(codeKey: string, initial: () => ProjectFiles) {
  const [files, setFilesState] = useState(initial);
  const latest = useRef(files);

  const setFiles = useCallback((next: ProjectFiles) => {
    latest.current = next;
    setFilesState(next);
  }, []);

  const updateFile = useCallback(
    (name: string, value: string) => {
      const next = { ...latest.current, [name]: value };
      setFiles(next);
      progress.saveCode(codeKey, next);
    },
    [codeKey, setFiles],
  );

  return { files, setFiles, updateFile };
}
