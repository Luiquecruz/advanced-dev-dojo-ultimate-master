import { tracks } from '../content';
import { isLessonComplete, progress, useProgress } from './progress';
import { hrefTo } from './route';
import { TrackLogo } from './TrackLogo';

/**
 * Landing page with the four tracks.
 */
export function Home() {
  const state = useProgress();
  const totalLessons = tracks.reduce((sum, track) => sum + track.lessons.length, 0);
  const totalChallenges = tracks.reduce((sum, track) => sum + track.lessons.filter((lesson) => lesson.challenge).length, 0);

  return (
    <div className="home">
      <header className="home-hero">
        <div className="brand-mark">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={40} height={40} />
          <span>Dev Dojo</span>
        </div>
        <h1>Learn modern front-end by writing real code.</h1>
        <p>
          Theory, hands-on challenges validated by tests, progressive hints and quizzes for TypeScript, React, Vue and Angular, from the fundamentals to the newest APIs, including the legacy patterns you still meet at work.
        </p>
        <div className="hero-stats">
          <span>
            <strong>{tracks.length}</strong> tracks
          </span>
          <span>
            <strong>{totalLessons}</strong> lessons
          </span>
          <span>
            <strong>{totalChallenges}</strong> coding challenges
          </span>
        </div>
      </header>

      <div className="track-grid">
        {tracks.map((track) => {
          const done = track.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
          const percent = track.lessons.length ? Math.round((done / track.lessons.length) * 100) : 0;
          const resumeId = state.lastLesson[track.id] ?? track.lessons[0]?.id;
          return (
            <article key={track.id} className="track-card" style={{ ['--accent' as string]: track.accent }}>
              <header>
                <TrackLogo track={track} size={44} />
                <div>
                  <h2>{track.title}</h2>
                  <span className="track-version">{track.version}</span>
                </div>
              </header>
              <p>{track.description}</p>
              <div className="track-meta">
                {track.modules.length} modules · {track.lessons.length} lessons
              </div>
              <div className="progress-bar" aria-label={`${percent}% complete`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="track-actions">
                <a className="button button-ghost" href={hrefTo({ page: 'track', trackId: track.id })}>
                  Curriculum
                </a>
                {resumeId && (
                  <a className="button button-primary" href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: resumeId })}>
                    {state.lastLesson[track.id] ? 'Continue' : 'Start'}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="how-it-works">
        <div>
          <h3>1. Learn</h3>
          <p>Each lesson starts with focused theory, examples, key concepts and links to the official docs.</p>
        </div>
        <div>
          <h3>2. Practice</h3>
          <p>Write code in a real editor next to the task. A live preview and automated tests validate your solution.</p>
        </div>
        <div>
          <h3>3. Get unstuck</h3>
          <p>Reveal hints one at a time, then the solution path, and only then the reference solution.</p>
        </div>
      </section>

      <footer className="home-footer">
        <span>Progress is saved in this browser.</span>
        <button
          className="button button-ghost small"
          onClick={() => confirm('Erase all progress and saved code?') && progress.resetAll()}
        >
          Reset progress
        </button>
      </footer>
    </div>
  );
}
