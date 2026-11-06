import clsx from 'clsx';
import type { Track } from '@/content';
import { isLessonComplete, useProgress } from '@/entities/progress';
import { moduleNumberLabel } from '@/entities/track';
import { Link } from 'react-router';
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
 * Stages of a mission with their waypoints and completion state. `compact` renders the flat list of the star map drawer,
 * with sticky stage headers, instead of one card per stage.
 */
export function ModuleList({ track, currentKey, compact = false, className, onNavigate }: ModuleListProps) {
  const state = useProgress();
  const Heading = compact ? 'h3' : 'h2';
  return (
    <div className={clsx('flex flex-col', compact ? 'pb-4' : 'gap-3.5', className)}>
      {track.modules.map((module, moduleIndex) => {
        const done = module.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
        return (
          <section
            key={module.id}
            className={compact ? 'shrink-0 border-t border-line first:border-t-0' : 'enter shrink-0 overflow-hidden rounded-card border border-line bg-elevated/45'}
            style={compact ? undefined : { ['--enter-index' as string]: Math.min(moduleIndex, MAX_STAGGERED_MODULES), ['--enter-delay' as string]: '220ms' }}
          >
            <header
              className={clsx(
                'flex gap-3.5',
                compact ? 'sticky top-0 z-10 items-center border-b border-line bg-panel px-4 py-2.5' : 'items-start border-b border-line px-4.5 py-4',
              )}
            >
              <span className={clsx('font-mono font-semibold text-accent', compact ? 'text-xs' : 'pt-0.5 text-[13px]')}>{moduleNumberLabel(module)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Heading className={clsx('m-0 font-semibold', compact ? 'truncate text-[13px] text-ink' : 'text-base')}>{module.title}</Heading>
                  {module.optional && <span className={tagClass('optional')}>optional</span>}
                </div>
                {!compact && <p className="mt-0.5 text-[13px] text-ink-muted">{module.description}</p>}
              </div>
              <span className={clsx('font-mono text-[11px] whitespace-nowrap', done === module.lessons.length ? 'text-success' : 'text-ink-faint')}>
                {done}/{module.lessons.length}
              </span>
            </header>
            <ol className={clsx('m-0 list-none', compact ? 'px-2 py-1.5' : 'p-1.5')}>
              {module.lessons.map((lesson) => {
                const complete = isLessonComplete(state, lesson);
                const current = lesson.key === currentKey;
                return (
                  <li key={lesson.key}>
                    <Link
                      to={hrefTo({ page: 'lesson', trackId: track.id, lessonId: lesson.id })}
                      className={clsx(
                        'flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-(--dur-fast) hover:bg-hover',
                        compact ? 'py-1.75' : 'py-2',
                        current ? 'bg-accent/10 text-ink shadow-[inset_2px_0_0_var(--accent)] hover:bg-accent/14' : complete ? 'text-ink-muted' : 'text-ink',
                      )}
                      aria-current={current ? 'page' : undefined}
                      data-motion-origin={`lesson:${lesson.key}`}
                      data-current={current || undefined}
                      onClick={onNavigate}
                    >
                      <span className={clsx('grid [&_svg]:size-3.75', complete ? 'text-success' : current ? 'text-accent' : 'text-ink-faint')}>
                        {complete ? <CheckIcon role="img" aria-label="Complete" /> : <CircleIcon role="img" aria-label="Not complete" />}
                      </span>
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      <span className="flex items-center gap-1.5">
                        {lesson.tags.includes('legacy') && <span className={tagClass('legacy')}>legacy</span>}
                        {(lesson.tags.includes('new') || lesson.tags.includes('react-19')) && <span className={tagClass('new')}>new</span>}
                        {!lesson.hasChallenge && <span className={tagClass('quiz')}>quiz</span>}
                        {!compact && (
                          <span className={clsx('min-w-19.5 text-right text-[11px] capitalize max-wide:hidden', lesson.level === 'advanced' || lesson.level === 'expert' ? 'text-advanced' : 'text-ink-faint')}>
                            {lesson.level}
                          </span>
                        )}
                      </span>
                    </Link>
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
