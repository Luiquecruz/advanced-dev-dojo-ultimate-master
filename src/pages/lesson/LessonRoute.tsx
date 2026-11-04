import { lazy, Suspense, use, useLayoutEffect, useRef, type RefObject } from 'react';
import { loadLesson, type LessonEntry, type Track } from '@/content';

const loadLessonPage = () => import('./LessonPage');
const LessonPage = lazy(() => loadLessonPage().then((module) => ({ default: module.LessonPage })));

interface LessonRouteProps {
  track: Track;
  entry: LessonEntry;
}

/**
 * Loads the lesson screen (editor, engines) and the lesson body on demand, showing the lesson title while they load.
 */
export function LessonRoute({ track, entry }: LessonRouteProps) {
  const placeholderFocused = useRef(false);
  void loadLessonPage();
  void loadLesson(entry);

  return (
    <Suspense fallback={<LessonLoading title={entry.title} onFocus={() => (placeholderFocused.current = true)} />}>
      <LoadedLesson track={track} entry={entry} placeholderFocused={placeholderFocused} />
    </Suspense>
  );
}

function LoadedLesson({ track, entry, placeholderFocused }: LessonRouteProps & { placeholderFocused: RefObject<boolean> }) {
  const lesson = use(loadLesson(entry));

  useLayoutEffect(() => {
    if (placeholderFocused.current && document.activeElement === document.body) {
      document.querySelector<HTMLElement>('[data-activity-title]')?.focus({ preventScroll: true });
    }
  }, [placeholderFocused]);

  return <LessonPage track={track} lesson={lesson} />;
}

function LessonLoading({ title, onFocus }: { title: string; onFocus(): void }) {
  return (
    <main className="grid h-full place-items-center content-center gap-2 bg-panel" aria-busy="true">
      <h1 className="m-0 text-[26px]/[1.2] font-bold tracking-[-0.02em] outline-none" tabIndex={-1} data-activity-title onFocus={onFocus}>
        {title}
      </h1>
      <p className="m-0 text-sm text-ink-faint" role="status">
        Loading lesson…
      </p>
    </main>
  );
}
