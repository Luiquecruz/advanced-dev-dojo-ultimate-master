import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { tracks } from '@/content';
import { BrandMark } from '@/shared/ui/BrandMark';
import { PathCarousel } from '@/features/path-carousel';
import { progress, summarizeTrack, useProgress } from '@/entities/progress';
import { buttonClass } from '@/shared/ui/classNames';

interface HomePageProps {
  onExploreChange(exploring: boolean): void;
  onTrailChange(trackId: string | undefined): void;
}

const HEADLINE = ['Learn', 'modern', 'front-end', 'by', 'writing', 'real', 'code.'];
const HIGHLIGHT_FROM = 5;
const EXPLORE_AFTER_MS = 1400;
const BACKDROP_LABELS: Record<string, string> = { 'react-state': 'State' };
const STEPS = [
  { title: 'Learn', text: 'Focused theory, examples, key concepts and links to the official docs.' },
  { title: 'Practice', text: 'A real editor, a live preview and automated tests on every challenge.' },
  { title: 'Get unstuck', text: 'Hints one at a time, then the solution path, then the solution.' },
];

const totalLessons = tracks.reduce((sum, track) => sum + track.lessons.length, 0);
const totalChallenges = tracks.reduce((sum, track) => sum + track.lessons.filter((lesson) => lesson.challenge).length, 0);

/**
 * Full-screen landing: editorial layout around the 3D path carousel, with the active track name as a giant backdrop.
 * The page accent and the ambient scene follow the active track.
 */
export function HomePage({ onExploreChange, onTrailChange }: HomePageProps) {
  const state = useProgress();
  const [active, setActive] = useState(() => Math.max(0, tracks.findIndex((track) => summarizeTrack(track, state).status === 'in-progress')));
  const track = tracks[active];

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
      className="relative isolate grid h-dvh min-h-150 grid-cols-[minmax(19rem,0.32fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-x-8 gap-y-4 overflow-hidden px-16 pt-6 pb-5 transition-[--accent] duration-700 ease-out max-wide:grid-cols-1 max-wide:grid-rows-[auto_auto_minmax(0,1fr)_auto] max-wide:gap-y-3 max-wide:px-4 max-wide:pt-4 max-wide:pb-3"
    >
      <SideRail side="left">Front-end training ground · Est. 2026</SideRail>
      <SideRail side="right">
        <span className="text-accent">{String(active + 1).padStart(2, '0')}</span> / {String(tracks.length).padStart(2, '0')} · {track.title}
      </SideRail>

      <header className="col-span-2 flex items-center justify-between gap-6 max-wide:col-span-1">
        <a href="#/" className="flex items-center gap-3" aria-label="Dev Dojo home">
          <BrandMark size={36} animated />
          <span className="enter text-lg font-semibold tracking-[-0.03em]" style={{ ['--enter-delay' as string]: '200ms' }}>
            Dev <span className="text-ink-muted">Dojo</span>
          </span>
        </a>
        <dl className="enter m-0 flex items-baseline gap-6 font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase max-wide:hidden" style={{ ['--enter-delay' as string]: '320ms' }}>
          <Stat value={tracks.length} label="tracks" />
          <Stat value={totalLessons} label="lessons" />
          <Stat value={totalChallenges} label="challenges" />
        </dl>
      </header>

      <div className="flex min-h-0 flex-col justify-center gap-7 overflow-hidden max-wide:gap-0 [@media(max-height:860px)]:gap-5">
        <h1 aria-label={HEADLINE.join(' ')} className="m-0 text-[clamp(30px,min(4.2vw,6.4dvh),84px)]/[0.98] font-semibold tracking-[-0.05em] max-wide:text-[clamp(30px,8.6vw,44px)]">
          {HEADLINE.map((word, index) => (
            <span key={word} aria-hidden="true">
              <span
                className={clsx('enter inline-block', index >= HIGHLIGHT_FROM && 'bg-[linear-gradient(100deg,var(--accent),#eaf2fc_130%)] bg-clip-text pb-[0.08em] text-transparent')}
                style={{ ['--enter-index' as string]: index, ['--enter-delay' as string]: '140ms' }}
              >
                {word}
              </span>{' '}
            </span>
          ))}
        </h1>
        <p className="enter m-0 max-w-[34ch] text-[15px]/relaxed text-ink-muted max-wide:hidden [@media(max-height:640px)]:hidden" style={{ ['--enter-delay' as string]: '640ms' }}>
          Theory, test-validated challenges, progressive hints and quizzes for TypeScript, React, Vue and Angular. From the fundamentals to the newest APIs, legacy patterns included.
        </p>
        <ol className="m-0 flex list-none flex-col gap-3.5 border-l border-line/70 p-0 pl-5 max-wide:hidden [@media(max-height:860px)]:gap-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="enter min-w-0" style={{ ['--enter-index' as string]: index, ['--enter-delay' as string]: '760ms' }}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, '0')}</span>
                <strong className="text-sm font-semibold">{step.title}</strong>
              </div>
              <p className="m-0 mt-0.5 text-xs text-ink-faint [@media(max-height:860px)]:hidden">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative @container min-h-0">
        <Backdrop active={active} />
        <PathCarousel tracks={tracks} active={active} onActiveChange={setActive} />
      </div>

      <footer
        className="enter col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-t border-line/60 pt-3.5 text-xs text-ink-faint max-wide:col-span-1 max-wide:grid-cols-1 max-wide:justify-items-center max-wide:border-none max-wide:pt-0"
        style={{ ['--enter-delay' as string]: '900ms' }}
      >
        <span className="max-wide:hidden">© 2026 Dev Dojo · Learn by building</span>
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
      {tracks.map((track, index) => {
        const label = BACKDROP_LABELS[track.id] ?? track.title;
        return (
          <span
            key={track.id}
            data-trail={track.id}
            className={clsx(
              'col-start-1 row-start-1 translate-y-[18%] mask-b-from-30% mask-b-to-90% backdrop-word leading-[0.8] font-extrabold tracking-[-0.065em] whitespace-nowrap transition-[opacity,filter,scale] duration-700 ease-out select-none',
              index === active ? 'scale-100 opacity-100 blur-none' : 'scale-105 opacity-0 blur-xl',
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

function SideRail({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  return (
    <p
      aria-hidden="true"
      className={clsx(
        'pointer-events-none absolute top-1/2 m-0 -translate-y-1/2 font-mono text-[11px] tracking-[0.32em] whitespace-nowrap text-ink-faint uppercase [writing-mode:vertical-rl] max-wide:hidden',
        side === 'left' ? 'left-5 rotate-180' : 'right-5',
      )}
    >
      <span className="enter block" style={{ ['--enter-delay' as string]: '1000ms' }}>
        {children}
      </span>
    </p>
  );
}
