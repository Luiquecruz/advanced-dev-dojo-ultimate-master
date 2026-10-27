import type { Track } from '../content';
import { ModuleList } from './ModuleList';
import { ProgressBar } from './ProgressBar';
import { isLessonComplete, useProgress } from './progress';
import { hrefTo } from './route';
import { TrackLogo } from './TrackLogo';
import { buttonClass } from './ui';
import { Curriculum } from '../ui/Curriculum';
import { useMotionState } from '../ui/useMotionState';

/**
 * Curriculum overview of one track.
 */
export function TrackPage({ track }: { track: Track }) {
  const state = useProgress();
  const motionState = useMotionState();
  const done = track.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
  const resumeId = state.lastLesson[track.id] ?? track.lessons[0]?.id;

  return (
    <main data-trail={track.id} className="mx-auto max-w-245 px-6 pt-9 pb-16 max-wide:px-4 max-wide:pt-6 max-wide:pb-12">
      <a href={hrefTo({ page: 'home' })} className="text-sm text-ink-muted hover:text-ink">
        ← All tracks
      </a>
      <div className="mt-5.5">
        <Curriculum label={`${track.title} curriculum`} paused={motionState === 'ACTIVITY'}>
          <header>
            <div className="flex items-center gap-4.5">
              <TrackLogo track={track} size={56} />
              <div>
                <h1 className="m-0 text-[40px]/[1.1] font-bold tracking-[-0.03em] max-wide:text-[32px]">{track.title}</h1>
                <span className="text-xs font-medium text-ink-faint">{track.version}</span>
              </div>
            </div>
            <p className="my-4 text-base text-ink-muted">{track.description}</p>
            <div className="mt-4.5 mb-7 flex flex-wrap items-center gap-4">
              <ProgressBar percent={track.lessons.length ? (done / track.lessons.length) * 100 : 0} label={`${done} of ${track.lessons.length} lessons complete`} large />
              <span className="text-ink-muted">
                {done}/{track.lessons.length} lessons complete
              </span>
              {resumeId && (
                <a className={buttonClass('primary')} href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: resumeId })}>
                  {state.lastLesson[track.id] ? 'Continue' : 'Start learning'}
                </a>
              )}
            </div>
          </header>
          <ModuleList track={track} />
        </Curriculum>
      </div>
    </main>
  );
}
