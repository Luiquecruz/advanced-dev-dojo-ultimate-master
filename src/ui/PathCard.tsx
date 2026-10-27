import type { Track } from '../content';
import { ProgressBar } from '../app/ProgressBar';
import { isLessonComplete, useProgress } from '../app/progress';
import { hrefTo } from '../app/route';
import { TrackLogo } from '../app/TrackLogo';
import { buttonClass } from '../app/ui';

/**
 * Track card of the path explorer. Follows the group tilt, lifts on hover or keyboard focus and layers its header for parallax.
 */
export function PathCard({ track }: { track: Track }) {
  const state = useProgress();
  const done = track.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
  const percent = track.lessons.length ? Math.round((done / track.lessons.length) * 100) : 0;
  const started = Boolean(state.lastLesson[track.id]);
  const resumeId = state.lastLesson[track.id] ?? track.lessons[0]?.id;

  return (
    <article
      data-trail={track.id}
      data-motion-origin={`track:${track.id}`}
      className="group/card relative flex flex-col gap-3.5 rounded-card border border-line bg-panel/80 p-5.5 shadow-[inset_0_3px_0_var(--accent)] tilt-surface transition-[translate,border-color] duration-(--dur-base) ease-out hover:translate-z-1.5 hover:border-line-strong has-focus-visible:translate-z-1.5 has-focus-visible:border-line-strong"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 tilt-glow transition-opacity duration-(--dur-base) group-hover/card:opacity-100 pointer-coarse:in-data-tilting:opacity-100"
      />
      <header className="flex items-center gap-3.5 transform-3d translate-z-px">
        <div className="translate-z-6">
          <TrackLogo track={track} size={44} />
        </div>
        <div className="translate-z-3">
          <h2 className="m-0 text-xl font-semibold">{track.title}</h2>
          <span className="text-xs font-medium text-ink-faint">{track.version}</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3.5 translate-z-px">
        <p className="m-0 flex-1 text-sm text-ink-muted">{track.description}</p>
        <div className="text-[13px] text-ink-faint">
          {track.modules.length} modules · {track.lessons.length} lessons
        </div>
        <ProgressBar percent={percent} label={`${percent}% complete`} />
        <div className="flex gap-2.5">
          <a className={buttonClass('ghost', 'regular', 'flex-1 justify-center')} href={hrefTo({ page: 'track', trackId: track.id })}>
            Curriculum
          </a>
          {resumeId && (
            <a className={buttonClass('primary', 'regular', 'flex-1 justify-center')} href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: resumeId })}>
              {started ? 'Continue' : 'Start'}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
