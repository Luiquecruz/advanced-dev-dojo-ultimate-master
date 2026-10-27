import { useState } from 'react';
import { trackById } from '../content';
import { AmbientScene } from './AmbientScene';
import { Home } from './Home';
import { LessonPage } from './LessonPage';
import { TrackPage } from './TrackPage';
import { hrefTo, useRoute } from './route';
import { sceneTargetFor } from './router-adapter';
import { buttonClass } from './ui';

/**
 * Root component: keeps the ambient scene mounted and routes between home, track and lesson pages.
 */
export function App() {
  const route = useRoute();
  const [exploring, setExploring] = useState(false);

  return (
    <>
      <AmbientScene {...sceneTargetFor(route, exploring)} />
      <RoutedPage onExploreChange={setExploring} />
    </>
  );
}

function RoutedPage({ onExploreChange }: { onExploreChange(exploring: boolean): void }) {
  const route = useRoute();
  const track = route.page === 'home' ? undefined : trackById.get(route.trackId);

  if (route.page === 'home') {
    return <Home onExploreChange={onExploreChange} />;
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
    <div className="grid h-full place-items-center content-center gap-4">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <a className={buttonClass('primary')} href={hrefTo({ page: 'home' })}>
        Back to Dev Dojo
      </a>
    </div>
  );
}
