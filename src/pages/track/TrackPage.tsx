import type { Track } from '@/content';
import { CurriculumPanel, ModuleList } from '@/features/curriculum';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { summarizeTrack, useProgress } from '@/entities/progress';
import { Link } from 'react-router';
import { hrefTo } from '@/shared/routing/route';
import { TrackLogo } from '@/entities/track';
import { buttonClass } from '@/shared/ui/classNames';
import { useMotionState } from '@/shared/motion/useMotionState';

/**
 * Curriculum overview of one track.
 */
export function TrackPage({ track }: { track: Track }) {
  const state = useProgress();
  const motionState = useMotionState();
  const { done, total, percent, status, resumeLesson } = summarizeTrack(track, state);
  const hasOptionalModule = track.modules.some((module) => module.optional);

  return (
    <main data-trail={track.id} className="mx-auto max-w-245 px-6 pt-9 pb-16 max-wide:px-4 max-wide:pt-6 max-wide:pb-12">
      <Link to={hrefTo({ page: 'home' })} className="enter inline-block text-sm text-ink-muted hover:text-ink">
        ← All tracks
      </Link>
      <div className="enter mt-5.5" style={{ ['--enter-delay' as string]: '80ms' }}>
        <CurriculumPanel label={`${track.title} curriculum`} paused={motionState === 'ACTIVITY'}>
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
              <ProgressBar percent={percent} label={`${done} of ${total} lessons complete`} large />
              <span className="text-ink-muted">
                {done}/{total} lessons complete
              </span>
              <Link className={buttonClass('primary')} to={hrefTo({ page: 'lesson', trackId: track.id, lessonId: resumeLesson.id })}>
                {status === 'not-started' ? 'Start learning' : 'Continue'}
              </Link>
              {hasOptionalModule && <p className="m-0 basis-full text-xs text-ink-faint">Lessons in optional modules count toward progress once you complete them.</p>}
            </div>
          </header>
          <ModuleList track={track} />
        </CurriculumPanel>
      </div>
    </main>
  );
}
