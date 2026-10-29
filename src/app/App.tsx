import { useLayoutEffect, useRef, useState } from 'react';
import { availableTrackById } from '@/content';
import { isActivityState } from '@/shared/motion/states';
import { ActivityShell } from './layout/ActivityShell';
import { useMotionState } from '@/shared/motion/useMotionState';
import { AmbientScene } from '@/features/ambient-scene';
import { HomePage } from '@/pages/home/HomePage';
import { LessonPage } from '@/pages/lesson/LessonPage';
import { TrackPage } from '@/pages/track/TrackPage';
import { hrefTo, useRoute } from '@/shared/routing/route';
import { sceneTargetFor, useMotionRouting, type ActivityRoute, type BaseRoute } from './routing/router-adapter';
import { buttonClass } from '@/shared/ui/classNames';

/**
 * Root component: keeps the ambient scene mounted, renders the base layer (home or curriculum) and the activity shell
 * above it, and lets the motion coordinator run the transitions between them.
 */
export function App() {
  const route = useRoute();
  const motionState = useMotionState();
  const [exploring, setExploring] = useState(false);
  const [homeTrail, setHomeTrail] = useState<string | undefined>();
  const baseRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const layers = useMotionRouting(route, exploring, { base: baseRef, surface: surfaceRef, content: contentRef });
  const baseInactive = motionState === 'ACTIVITY_TRANSITION' || motionState === 'ACTIVITY';

  useLayoutEffect(() => {
    document.documentElement.style.overflow = isActivityState(motionState) ? 'hidden' : '';
  }, [motionState]);

  return (
    <>
      <AmbientScene {...sceneTargetFor(motionState, route, homeTrail)} />
      <div ref={baseRef} className="h-full [view-transition-name:page]" inert={baseInactive}>
        <BasePage base={layers.base} onExploreChange={setExploring} onTrailChange={setHomeTrail} />
      </div>
      {layers.activity && (
        <ActivityShell surfaceRef={surfaceRef} contentRef={contentRef} inactive={motionState === 'RETURN_TRANSITION'}>
          <ActivityPage activity={layers.activity} />
        </ActivityShell>
      )}
    </>
  );
}

interface BasePageProps {
  base: BaseRoute;
  onExploreChange(exploring: boolean): void;
  onTrailChange(trackId: string | undefined): void;
}

function BasePage({ base, onExploreChange, onTrailChange }: BasePageProps) {
  if (base.page === 'home') {
    return <HomePage onExploreChange={onExploreChange} onTrailChange={onTrailChange} />;
  }
  const track = availableTrackById.get(base.trackId);
  return track ? <TrackPage key={track.id} track={track} /> : <NotFound />;
}

function ActivityPage({ activity }: { activity: ActivityRoute }) {
  const track = availableTrackById.get(activity.trackId);
  const lesson = track?.lessons.find((entry) => entry.id === activity.lessonId);
  return track && lesson ? <LessonPage key={lesson.key} track={track} lesson={lesson} /> : <NotFound />;
}

function NotFound() {
  return (
    <main className="grid h-full place-items-center content-center gap-4 bg-void">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <a className={buttonClass('primary')} href={hrefTo({ page: 'home' })}>
        Back to Dev Dojo
      </a>
    </main>
  );
}
