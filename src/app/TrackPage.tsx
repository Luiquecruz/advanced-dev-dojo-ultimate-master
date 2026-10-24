import type { Track } from '../content';
import { ModuleList } from './ModuleList';
import { isLessonComplete, useProgress } from './progress';
import { hrefTo } from './route';
import { TrackLogo } from './TrackLogo';

/**
 * Curriculum overview of one track.
 */
export function TrackPage({ track }: { track: Track }) {
  const state = useProgress();
  const done = track.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
  const resumeId = state.lastLesson[track.id] ?? track.lessons[0]?.id;

  return (
    <div className="track-page" style={{ ['--accent' as string]: track.accent }}>
      <header className="track-hero">
        <a href={hrefTo({ page: 'home' })} className="back-link">
          ← All tracks
        </a>
        <div className="track-hero-title">
          <TrackLogo track={track} size={56} />
          <div>
            <h1>{track.title}</h1>
            <span className="track-version">{track.version}</span>
          </div>
        </div>
        <p>{track.description}</p>
        <div className="track-hero-actions">
          <div className="progress-bar large">
            <span style={{ width: `${track.lessons.length ? (done / track.lessons.length) * 100 : 0}%` }} />
          </div>
          <span className="muted">
            {done}/{track.lessons.length} lessons complete
          </span>
          {resumeId && (
            <a className="button button-primary" href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: resumeId })}>
              {state.lastLesson[track.id] ? 'Continue' : 'Start learning'}
            </a>
          )}
        </div>
      </header>
      <ModuleList track={track} />
    </div>
  );
}
