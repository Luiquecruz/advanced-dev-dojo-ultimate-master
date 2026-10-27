import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Track } from '../content';
import { ProgressBar } from '../app/ProgressBar';
import { useProgress } from '../app/progress';
import { hrefTo } from '../app/route';
import { TrackLogo } from '../app/TrackLogo';
import { ChartIcon, CheckIcon, ChevronRightIcon, CircleIcon, HalfCircleIcon } from '../app/icons';
import { buttonClass } from '../app/ui';
import { GlowBorder } from './GlowBorder';
import { modulesAroundStage, summarizeTrack, type ModuleProgress, type TrackStatus } from './trackSummary';

const TIMELINE_SIZE = 5;

const STATUS: Record<TrackStatus, { label: string; icon: ReactNode; className: string }> = {
  'not-started': { label: 'Not started', icon: <CircleIcon />, className: 'border-line-strong text-ink-muted' },
  'in-progress': { label: 'In progress', icon: <HalfCircleIcon />, className: 'border-accent/40 bg-accent/10 text-accent' },
  completed: { label: 'Completed', icon: <CheckIcon />, className: 'border-success/40 bg-success/10 text-success' },
};

/**
 * Track card of the path carousel: status, current stage, a timeline of the modules around it and the overall progress.
 * Only the active card is interactive. The card is a single flat plane inside the 3D stage (no `preserve-3d` of its own),
 * so its buttons hit-test in plain 2D in every browser.
 */
export function PathCard({ track, active }: { track: Track; active: boolean }) {
  const state = useProgress();
  const summary = summarizeTrack(track, state);
  const status = STATUS[summary.status];
  const currentModule = summary.modules[summary.currentModuleIndex];

  return (
    <article
      data-trail={track.id}
      data-motion-origin={`track:${track.id}`}
      className={clsx(
        'group/card relative flex h-full flex-col gap-4 rounded-panel border border-accent/25 bg-panel/85 p-6 tilt-surface shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.06),0_30px_80px_-30px_rgb(var(--accent-rgb)/0.45),inset_0_1px_0_rgb(255_255_255/0.06)] transition-[border-color] duration-(--dur-base) ease-out',
        active && 'pointer-events-auto hover:border-accent/45 has-focus-visible:border-accent/45',
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(160deg,rgb(var(--accent-rgb)/0.10),transparent_45%)]" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 tilt-glow transition-opacity duration-(--dur-base) group-hover/card:opacity-100 pointer-coarse:in-data-tilting:opacity-100"
      />
      {active && <GlowBorder />}

      <header className="relative flex flex-col gap-4" inert={!active}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">Learning path</span>
          <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase [&_svg]:size-3', status.className)}>
            {status.icon}
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <TrackLogo track={track} size={48} />
          <div className="min-w-0">
            <h2 className="m-0 truncate text-2xl/tight font-bold tracking-[-0.02em]">{track.title}</h2>
            <span className="block truncate text-xs font-medium text-ink-faint">{track.version}</span>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-4" inert={!active}>
        <p className="m-0 line-clamp-2 flex-none text-sm text-ink-muted">{track.description}</p>

        <div className="text-sm">
          <div className="font-mono text-xs font-semibold text-accent">
            Stage {summary.currentModuleIndex + 1} of {summary.modules.length} · {currentModule.module.title}
          </div>
          <div className="mt-0.5 truncate text-ink-muted">{summary.status === 'completed' ? 'Track complete' : `Next up: ${summary.resumeLesson.title}`}</div>
        </div>

        <ol className="relative m-0 flex list-none flex-col gap-1.5 p-0 before:absolute before:top-3.5 before:bottom-3.5 before:left-4.5 before:w-px before:bg-accent/20">
          {modulesAroundStage(summary, TIMELINE_SIZE).map((entry) => (
            <TimelineRow key={entry.module.id} entry={entry} />
          ))}
        </ol>

        <div className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-void/40 px-3.5 py-3">
          <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent/10 text-accent">
            <ChartIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">Overall progress</span>
              <span className="font-mono text-accent">{summary.percent}%</span>
            </div>
            <ProgressBar percent={summary.percent} label={`${summary.percent}% of ${track.title} complete`} />
            <div className="mt-1 text-[11px] text-ink-faint">
              {summary.done} of {summary.total} lessons · {track.modules.length} modules
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <a className={buttonClass('ghost', 'regular', 'flex-1 justify-center')} href={hrefTo({ page: 'track', trackId: track.id })} draggable={false}>
            Curriculum
          </a>
          <a className={buttonClass('primary', 'regular', 'flex-1 justify-center')} href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: summary.resumeLesson.id })} draggable={false}>
            {summary.status === 'not-started' ? 'Start' : 'Continue'}
          </a>
        </div>
      </div>

      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-void carousel-shade" />
    </article>
  );
}

function TimelineRow({ entry }: { entry: ModuleProgress }) {
  const current = entry.state === 'current';
  return (
    <li className={clsx('relative flex items-center gap-3 rounded-lg border px-2 py-1.5', current ? 'border-accent/35 bg-accent/8' : 'border-transparent')}>
      <span
        className={clsx(
          'relative z-10 grid size-5 flex-none place-items-center rounded-full border font-mono text-[10px] font-semibold',
          current
            ? 'border-accent bg-accent text-on-accent shadow-[0_0_12px_rgb(var(--accent-rgb)/0.7)]'
            : entry.state === 'done'
              ? 'border-success/60 bg-panel text-success'
              : 'border-line-strong bg-panel text-ink-faint',
        )}
      >
        {entry.state === 'done' ? <CheckIcon className="size-3" /> : entry.index + 1}
      </span>
      <span className={clsx('min-w-0 flex-1 truncate text-[13px] font-medium', current ? 'text-ink' : 'text-ink-muted')}>{entry.module.title}</span>
      <span className="flex-none font-mono text-[11px] text-ink-faint" aria-label={`${entry.done} of ${entry.total} lessons`}>
        {entry.done}/{entry.total}
      </span>
      <span className={clsx('flex-none [&_svg]:size-3.5', current ? 'text-accent' : entry.state === 'done' ? 'text-success' : 'text-ink-faint')}>
        {entry.state === 'done' ? (
          <CheckIcon role="img" aria-label="Module complete" />
        ) : current ? (
          <ChevronRightIcon role="img" aria-label="Current stage" />
        ) : (
          <CircleIcon role="img" aria-label="Not started" />
        )}
      </span>
    </li>
  );
}
