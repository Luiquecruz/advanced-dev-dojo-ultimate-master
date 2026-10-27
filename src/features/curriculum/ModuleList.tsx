import clsx from 'clsx';
import type { Track } from '@/content';
import { isLessonComplete, useProgress } from '@/entities/progress';
import { hrefTo } from '@/shared/routing/route';
import { CheckIcon, CircleIcon } from '@/shared/ui/icons';
import { tagClass } from '@/shared/ui/classNames';

interface ModuleListProps {
  track: Track;
  currentKey?: string;
  compact?: boolean;
  className?: string;
  onNavigate?(): void;
}

const MAX_STAGGERED_MODULES = 8;

/**
 * Modules of a track with their lessons and completion state.
 */
export function ModuleList({ track, currentKey, compact = false, className, onNavigate }: ModuleListProps) {
  const state = useProgress();
  return (
    <div className={clsx('flex flex-col gap-3.5', className)}>
      {track.modules.map((module, moduleIndex) => {
        const done = module.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
        return (
          <section
            key={module.id}
            className="enter overflow-hidden rounded-xl border border-line bg-elevated/45"
            style={{ ['--enter-index' as string]: Math.min(moduleIndex, MAX_STAGGERED_MODULES), ['--enter-delay' as string]: '220ms' }}
          >
            <header className="flex items-start gap-3.5 border-b border-line px-4.5 py-4">
              <span className="pt-0.5 font-mono text-[13px] font-semibold text-accent">{String(moduleIndex + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <h2 className="m-0 text-base font-semibold">{module.title}</h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">{module.description}</p>
              </div>
              <span className="text-xs whitespace-nowrap text-ink-faint">
                {done}/{module.lessons.length}
              </span>
            </header>
            <ol className="m-0 list-none p-1.5">
              {module.lessons.map((lesson) => {
                const complete = isLessonComplete(state, lesson);
                const current = lesson.key === currentKey;
                return (
                  <li key={lesson.key}>
                    <a
                      href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: lesson.id })}
                      className={clsx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-hover', current && 'bg-hover shadow-[inset_3px_0_0_var(--accent)]')}
                      aria-current={current ? 'page' : undefined}
                      data-motion-origin={`lesson:${lesson.key}`}
                      data-current={current || undefined}
                      onClick={onNavigate}
                    >
                      <span className={clsx('grid [&_svg]:size-3.75', complete ? 'text-success' : 'text-ink-faint')}>
                        {complete ? <CheckIcon role="img" aria-label="Complete" /> : <CircleIcon role="img" aria-label="Not complete" />}
                      </span>
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      <span className="flex items-center gap-1.5">
                        {lesson.tags.includes('legacy') && <span className={tagClass('legacy')}>legacy</span>}
                        {(lesson.tags.includes('new') || lesson.tags.includes('react-19')) && <span className={tagClass('new')}>new</span>}
                        {!lesson.challenge && <span className={tagClass('quiz')}>quiz</span>}
                        {!compact && (
                          <span className={clsx('min-w-19.5 text-right text-[11px] capitalize max-wide:hidden', lesson.level === 'advanced' || lesson.level === 'expert' ? 'text-advanced' : 'text-ink-faint')}>
                            {lesson.level}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
