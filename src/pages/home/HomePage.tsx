import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { availableTracks } from '@/content';
import { RotatingWords } from '@/shared/ui/RotatingWords';
import { PathCarousel } from '@/features/path-carousel';
import { progress, summarizeTrack, useProgress } from '@/entities/progress';
import { buttonClass } from '@/shared/ui/classNames';

interface HomePageProps {
  onExploreChange(exploring: boolean): void;
  onTrailChange(trackId: string | undefined): void;
}

const HEADLINE_WORDS = ['Learn', 'Build', 'Code', 'Front-end', 'Back-end', 'Architecture', 'Development', 'Software Engineer', 'AI Engineer'];
const HEADLINE_INTERVAL_MS = 6500;
const AUTHOR_URL = 'https://www.linkedin.com/in/luique-cruz/';
const HEADLINE_LABEL = 'Dev Dojo: learn, build and code, from front-end and back-end to architecture, development, software and AI engineering';
const EXPLORE_AFTER_MS = 1400;

const totalLessons = availableTracks.reduce((sum, track) => sum + track.lessons.length, 0);
const totalChallenges = availableTracks.reduce((sum, track) => sum + track.lessons.filter((lesson) => lesson.challenge).length, 0);

/**
 * Full-screen landing: editorial layout around the 3D path carousel, with the active track name as a giant backdrop.
 * The page accent and the ambient scene follow the active track.
 */
export function HomePage({ onExploreChange, onTrailChange }: HomePageProps) {
  const state = useProgress();
  const [active, setActive] = useState(() => Math.max(0, availableTracks.findIndex((track) => summarizeTrack(track, state).status === 'in-progress')));
  const track = availableTracks[active];

  useEffect(() => {
    onTrailChange(track.id);
  }, [track.id, onTrailChange]);

  useEffect(() => {
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXPLORE_AFTER_MS;
    const timer = setTimeout(() => onExploreChange(true), delay);
    return () => {
      clearTimeout(timer);
      onExploreChange(false);
      onTrailChange(undefined);
    };
  }, [onExploreChange, onTrailChange]);

  return (
    <main
      data-trail={track.id}
      className="relative isolate grid h-dvh min-h-150 grid-rows-[auto_minmax(0,1fr)_auto] gap-y-4 overflow-hidden px-28 pt-6 pb-5 max-wide:gap-y-3 max-wide:px-4 max-wide:pt-5 max-wide:pb-3"
    >
      <SideRail>
        <span className="text-accent">{String(active + 1).padStart(2, '0')}</span> / {String(availableTracks.length).padStart(2, '0')} · {track.title}
      </SideRail>

      <header className="flex items-center justify-end max-wide:hidden">
        <dl className="enter m-0 flex items-baseline gap-6 font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase max-wide:hidden" style={{ ['--enter-delay' as string]: '320ms' }}>
          <Stat value={availableTracks.length} label="tracks" />
          <Stat value={totalLessons} label="lessons" />
          <Stat value={totalChallenges} label="challenges" />
        </dl>
      </header>

      <div className="absolute top-1/2 left-5 z-10 -translate-y-1/2 rotate-180 [writing-mode:vertical-rl] max-wide:static max-wide:translate-y-0 max-wide:rotate-0 max-wide:text-center max-wide:[writing-mode:horizontal-tb]">
        <h1
          aria-label={HEADLINE_LABEL}
          className="enter m-0 font-mono text-[11px] font-normal tracking-[0.32em] whitespace-nowrap text-accent uppercase transition-colors duration-700 [text-shadow:0_0_12px_rgb(var(--accent-rgb)/0.35)]"
          style={{ ['--enter-delay' as string]: '160ms' }}
        >
          <RotatingWords words={HEADLINE_WORDS} intervalMs={HEADLINE_INTERVAL_MS} className="justify-items-center" />
        </h1>
      </div>

      <div className="relative @container min-h-0">
        <Backdrop active={active} />
        <PathCarousel tracks={availableTracks} active={active} onActiveChange={setActive} />
      </div>

      <footer
        className="enter grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-t border-line/60 pt-3.5 text-xs text-ink-faint max-wide:grid-cols-1 max-wide:justify-items-center max-wide:border-none max-wide:pt-0"
        style={{ ['--enter-delay' as string]: '900ms' }}
      >
        <span className="max-wide:hidden">
          © 2026{' '}
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline transition-colors duration-500 hover:text-accent">
            Luique Cruz
          </a>{' '}
          · Learn by building
        </span>
        <div className="flex items-center gap-3">
          <span>Saved in this browser</span>
          <button className={buttonClass('ghost', 'small')} onClick={() => confirm('Erase all progress and saved code?') && progress.resetAll()}>
            Reset progress
          </button>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="m-0 text-sm font-semibold tracking-normal text-ink">{value}</dd>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

function Backdrop({ active }: { active: number }) {
  return (
    <div aria-hidden="true" className="enter pointer-events-none absolute inset-0 -z-10 grid items-end justify-items-center overflow-hidden max-wide:hidden" style={{ ['--enter-delay' as string]: '100ms' }}>
      {availableTracks.map((track, index) => {
        const label = track.shortTitle ?? track.title;
        return (
          <span
            key={track.id}
            data-trail={track.id}
            className={clsx(
              'col-start-1 row-start-1 translate-y-[18%] mask-b-from-30% mask-b-to-90% backdrop-word leading-[0.8] font-extrabold tracking-[-0.065em] whitespace-nowrap transition-[opacity,scale] duration-700 ease-out select-none',
              index === active ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
            )}
            style={{ fontSize: `min(30cqw, ${(165 / label.length).toFixed(2)}cqw, 36dvh)` }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function SideRail({ children }: { children: ReactNode }) {
  return (
    <p
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-5 m-0 -translate-y-1/2 font-mono text-[11px] tracking-[0.32em] whitespace-nowrap text-ink-faint uppercase [writing-mode:vertical-rl] max-wide:hidden"
    >
      <span className="enter block" style={{ ['--enter-delay' as string]: '1000ms' }}>
        {children}
      </span>
    </p>
  );
}
