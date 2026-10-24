import type { Track } from '../content';
import { isLessonComplete, useProgress } from './progress';
import { hrefTo } from './route';
import { CheckIcon, CircleIcon } from './icons';

/**
 * Modules of a track with their lessons and completion state.
 */
export function ModuleList({ track, currentKey, onNavigate }: { track: Track; currentKey?: string; onNavigate?(): void }) {
  const state = useProgress();
  return (
    <div className="module-list">
      {track.modules.map((module, moduleIndex) => {
        const done = module.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
        return (
          <section key={module.id} className="module-card">
            <header>
              <span className="module-index">{String(moduleIndex + 1).padStart(2, '0')}</span>
              <div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </div>
              <span className="module-progress">
                {done}/{module.lessons.length}
              </span>
            </header>
            <ol>
              {module.lessons.map((lesson) => {
                const complete = isLessonComplete(state, lesson);
                return (
                  <li key={lesson.key}>
                    <a
                      href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: lesson.id })}
                      className={`lesson-link ${lesson.key === currentKey ? 'current' : ''} ${complete ? 'complete' : ''}`}
                      onClick={onNavigate}
                    >
                      <span className="lesson-status">{complete ? <CheckIcon /> : <CircleIcon />}</span>
                      <span className="lesson-link-title">{lesson.title}</span>
                      <span className="lesson-link-meta">
                        {lesson.tags.includes('legacy') && <span className="tag tag-legacy">legacy</span>}
                        {(lesson.tags.includes('new') || lesson.tags.includes('react-19')) && <span className="tag tag-new">new</span>}
                        {!lesson.challenge && <span className="tag tag-theory">quiz</span>}
                        <span className={`level level-${lesson.level}`}>{lesson.level}</span>
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
