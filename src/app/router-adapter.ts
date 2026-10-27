import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { TrackId } from '../content';
import { motionCoordinator } from '../motion/coordinator';
import { isActivityState, type MotionState, type RestingState } from '../motion/states';
import type { RenderMode, SceneState } from '../scene/types';
import { hrefTo, type Route } from './route';

export interface SceneTarget {
  state: SceneState;
  trail?: TrackId;
  focus: number;
  renderMode: RenderMode;
}

export type BaseRoute = { page: 'home' } | { page: 'track'; trackId: TrackId };

export interface ActivityRoute {
  trackId: TrackId;
  lessonId: string;
}

export interface Layers {
  base: BaseRoute;
  activity?: ActivityRoute;
}

export interface MotionRefs {
  base: RefObject<HTMLElement | null>;
  surface: RefObject<HTMLElement | null>;
  content: RefObject<HTMLElement | null>;
}

type PendingMove = { kind: 'enter'; activity: ActivityRoute } | { kind: 'leave'; target: RestingState; baseChanged: boolean };

const CURRICULUM_FOCUS = 0.35;

/**
 * Resting motion state a route settles in. The home page is the intro until the track grid is explored.
 */
export function restingStateFor(route: Route, exploring: boolean): RestingState {
  if (route.page === 'home') {
    return exploring ? 'PATH_EXPLORER' : 'INTRO';
  }
  return route.page === 'track' ? 'CURRICULUM' : 'ACTIVITY';
}

/**
 * Ambient scene target for the motion state. During a return the route already names the destination.
 */
export function sceneTargetFor(state: MotionState, route: Route, homeTrail?: TrackId): SceneTarget {
  const trail = route.page === 'home' ? homeTrail : route.trackId;
  if (state === 'ACTIVITY_TRANSITION') {
    return { state: 'activity', trail, focus: CURRICULUM_FOCUS, renderMode: 'running' };
  }
  if (state === 'ACTIVITY') {
    return { state: 'activity', trail, focus: 1, renderMode: 'paused' };
  }
  if (route.page === 'track') {
    return { state: 'curriculum', trail, focus: CURRICULUM_FOCUS, renderMode: 'running' };
  }
  return { state: state === 'INTRO' ? 'intro' : 'explorer', trail, focus: 0, renderMode: 'running' };
}

function baseOf(route: Route): BaseRoute {
  return route.page === 'home' ? { page: 'home' } : { page: 'track', trackId: route.trackId };
}

function initialLayers(route: Route): Layers {
  return route.page === 'lesson' ? { base: baseOf(route), activity: { trackId: route.trackId, lessonId: route.lessonId } } : { base: baseOf(route) };
}

function findOrigin(base: HTMLElement, activity: ActivityRoute): HTMLElement | null {
  return (
    base.querySelector<HTMLElement>(`[data-motion-origin="lesson:${activity.trackId}/${activity.lessonId}"]`) ??
    base.querySelector<HTMLElement>(`[data-motion-origin="track:${activity.trackId}"]`)
  );
}

function canViewTransition(): boolean {
  return 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isOnScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
}

/**
 * Maps routes to the rendered layers and drives the motion coordinator: a lesson route expands the activity from its origin
 * in the base layer, leaving it collapses back to that origin. Switching base pages (home, curriculum) runs a view
 * transition on the page layer only. Direct loads resolve their state without animation.
 */
export function useMotionRouting(route: Route, exploring: boolean, refs: MotionRefs): Layers {
  const routeKey = hrefTo(route);
  const [layers, setLayers] = useState(() => initialLayers(route));
  const pending = useRef<PendingMove | null>(null);
  const resolved = useRef(false);

  useLayoutEffect(() => {
    if (!resolved.current) {
      resolved.current = true;
      motionCoordinator.resolveInitial(restingStateFor(route, exploring));
      return;
    }
    if (route.page === 'lesson') {
      const activity = { trackId: route.trackId, lessonId: route.lessonId };
      pending.current = { kind: 'enter', activity };
      setLayers((current) => ({ base: current.base, activity }));
      return;
    }
    const base = baseOf(route);
    const leave = () =>
      setLayers((current) => {
        pending.current = { kind: 'leave', target: restingStateFor(route, exploring), baseChanged: hrefTo(current.base) !== hrefTo(base) };
        return { base, activity: current.activity };
      });
    if (!layers.activity && hrefTo(layers.base) !== hrefTo(base) && canViewTransition()) {
      document.startViewTransition(() => flushSync(leave)).updateCallbackDone.catch(leave);
      return;
    }
    leave();
  }, [routeKey]);

  useLayoutEffect(() => {
    const move = pending.current;
    pending.current = null;
    if (!move) {
      return;
    }
    const base = refs.base.current!;
    if (move.kind === 'enter') {
      const origin = findOrigin(base, move.activity);
      void motionCoordinator.go('ACTIVITY', { surface: refs.surface.current!, content: refs.content.current!, origin: origin && isOnScreen(origin) ? origin : null });
      return;
    }
    if (move.baseChanged) {
      window.scrollTo(0, 0);
    }
    if (!layers.activity) {
      void motionCoordinator.go(move.target);
      return;
    }
    const origin = findOrigin(base, layers.activity);
    if (origin && !isOnScreen(origin)) {
      origin.scrollIntoView({ block: 'center' });
    }
    void motionCoordinator.go(move.target, { surface: refs.surface.current!, content: refs.content.current!, origin }).then(() => {
      if (!isActivityState(motionCoordinator.state)) {
        setLayers((current) => ({ base: current.base }));
      }
    });
  }, [layers]);

  useLayoutEffect(() => {
    if (route.page === 'home' && !isActivityState(motionCoordinator.state)) {
      void motionCoordinator.go(restingStateFor(route, exploring));
    }
  }, [exploring, routeKey]);

  return layers;
}
