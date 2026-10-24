import { trackById } from '../content';
import { Home } from './Home';
import { LessonPage } from './LessonPage';
import { TrackPage } from './TrackPage';
import { hrefTo, useRoute } from './route';

/**
 * Root component: routes between home, track and lesson pages.
 */
export function App() {
  const route = useRoute();
  const track = route.page === 'home' ? undefined : trackById.get(route.trackId);

  if (route.page === 'home') {
    return <Home />;
  }
  if (!track) {
    return <NotFound />;
  }
  if (route.page === 'track') {
    return <TrackPage track={track} />;
  }
  const lesson = track.lessons.find((entry) => entry.id === route.lessonId);
  if (!lesson) {
    return <NotFound />;
  }
  return <LessonPage key={lesson.key} track={track} lesson={lesson} />;
}

function NotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <a className="button button-primary" href={hrefTo({ page: 'home' })}>
        Back to Dev Dojo
      </a>
    </div>
  );
}
