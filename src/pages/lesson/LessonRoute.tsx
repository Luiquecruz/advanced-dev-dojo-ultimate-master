import { Component, lazy, Suspense, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { loadLesson, type LessonEntry, type Track } from '@/content';
import { BrandMark } from '@/shared/ui/BrandMark';
import { buttonClass } from '@/shared/ui/classNames';

const loadLessonPage = () => import('./LessonPage');
const LessonPage = lazy(() => loadLessonPage().then((module) => ({ default: module.LessonPage })));
const STALLED_AFTER_MS = 10000;

interface LessonRouteProps {
  track: Track;
  entry: LessonEntry;
}

/**
 * Loads the waypoint screen (editor, engines) and the lesson body on demand, showing a placeholder with the screen layout while they load.
 * A failed load shows the same placeholder with a retry instead of an empty screen.
 */
export function LessonRoute({ track, entry }: LessonRouteProps) {
  const placeholderFocused = useRef(false);
  const onFocus = () => (placeholderFocused.current = true);
  loadLessonPage().catch(() => undefined);
  loadLesson(entry).catch(() => undefined);

  return (
    <LessonLoadBoundary fallback={<LessonLoading track={track} entry={entry} onFocus={onFocus} failed />}>
      <Suspense fallback={<LessonLoading track={track} entry={entry} onFocus={onFocus} />}>
        <LoadedLesson track={track} entry={entry} placeholderFocused={placeholderFocused} />
      </Suspense>
    </LessonLoadBoundary>
  );
}

/**
 * Renders the fallback once loading the waypoint screen or its body throws.
 */
class LessonLoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
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

const SKELETON_LINES = ['w-11/12', 'w-full', 'w-4/5', 'w-2/3', 'w-full', 'w-3/4'];

/**
 * Placeholder with the layout of the waypoint screen: the top bar, the waypoint header with its real title and summary,
 * and the workspace plotting its course, so the loaded screen replaces it without a jump.
 */
function LessonLoading({ track, entry, onFocus, failed = false }: LessonRouteProps & { onFocus(): void; failed?: boolean }) {
  const module = track.modules.find((candidate) => candidate.id === entry.moduleId)!;
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), STALLED_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div data-trail={track.id} className="flex h-full flex-col overflow-hidden bg-void" aria-busy="true">
      <header className="flex h-13 flex-none items-center gap-2.5 border-b border-line bg-elevated px-2.5">
        <span className="size-8.5" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm whitespace-nowrap text-ink-muted">
          <span className="flex items-center gap-2 font-semibold tracking-[-0.02em] text-ink max-wide:hidden">
            <BrandMark size={30} />
            Constela Mission
          </span>
          <span className="max-wide:hidden">/</span>
          <span>{track.title}</span>
          <span>/</span>
          <span className="truncate text-ink">{entry.title}</span>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 max-wide:flex-col">
        <section className="flex w-2/5 flex-col bg-panel max-wide:h-1/2 max-wide:w-full">
          <div className="flex-none border-b border-line-strong bg-elevated/70 px-6.5 pt-4.5 pb-3 max-wide:px-4 max-wide:pt-3.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
              {module.title} · {entry.level}
            </span>
            <h1 className="mt-1.5 mb-1 text-[22px]/[1.25] font-bold tracking-[-0.015em] outline-none max-wide:text-xl/tight" tabIndex={-1} data-activity-title onFocus={onFocus}>
              {entry.title}
            </h1>
            <p className="m-0 text-sm text-ink-muted">{entry.summary}</p>
            <div className="-mx-1 mt-3.5 flex gap-1.5">
              <span className="h-8 w-24 rounded-full bg-accent/10 ring-1 ring-accent/30 ring-inset" />
              <span className="h-8 w-20 rounded-full ring-1 ring-line-strong ring-inset" />
            </div>
          </div>
          <div className="flex flex-col gap-3 px-6.5 pt-6 max-wide:px-4">
            {SKELETON_LINES.map((width, index) => (
              <span key={index} className={clsx('h-3 animate-pulse rounded-full bg-hover motion-reduce:animate-none', width)} style={{ animationDelay: `${index * 90}ms` }} />
            ))}
          </div>
        </section>
        <div className="w-px flex-none bg-line max-wide:h-px max-wide:w-full" />
        <section className="grid flex-1 place-items-center content-center gap-4 bg-void px-6 text-center">
          {failed ? (
            <>
              <span className="grid size-11 place-items-center rounded-full ring-1 ring-danger/40">
                <span className="size-1.5 rounded-full bg-danger" />
              </span>
              <div role="alert">
                <p className="m-0 font-mono text-[11px] tracking-[0.16em] text-danger uppercase">Signal lost</p>
                <p className="mt-1.5 mb-0 text-sm text-ink-muted">This waypoint did not load. Check your connection and try again.</p>
              </div>
              <button className={buttonClass('primary')} onClick={() => location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <span className="relative grid size-11 place-items-center rounded-full ring-1 ring-accent/25">
                <span className="absolute inset-0 animate-spin [animation-duration:2.4s] motion-reduce:animate-none">
                  <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent-rgb)/0.8)]" />
                </span>
                <span className="size-1.5 rounded-full bg-ink" />
              </span>
              <p className="m-0 font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase" role="status">
                {stalled ? 'Still plotting course…' : 'Plotting course to waypoint…'}
              </p>
              {stalled && (
                <div className="flex flex-col items-center gap-3">
                  <p className="m-0 text-sm text-ink-muted">The connection looks slow.</p>
                  <button className={buttonClass('ghost', 'small')} onClick={() => location.reload()}>
                    Retry
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
