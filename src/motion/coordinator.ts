import { expandFromOrigin, type FlipAnimations, type FlipElements, type FlipTiming } from './flip';
import type { MotionState, RestingState } from './states';

export interface MotionCoordinator {
  readonly state: MotionState;
  resolveInitial(state: RestingState): void;
  go(target: RestingState, elements?: FlipElements): Promise<void>;
  cancelTo(state: RestingState): void;
  subscribe(listener: (state: MotionState) => void): () => void;
}

type Direction = 'forward' | 'backward';

interface Transition {
  direction: Direction;
  returnTarget: RestingState;
  elements: FlipElements;
  animations: FlipAnimations;
  timeoutMs: number;
  timer?: ReturnType<typeof setTimeout>;
  promise: Promise<void>;
  resolve(): void;
}

const SAFETY_FACTOR = 2;
const FOCUSABLE_ORIGIN = 'a, button';

function readTiming(reducedMotion: boolean): FlipTiming {
  const root = getComputedStyle(document.documentElement);
  return {
    durationMs: Number.parseFloat(root.getPropertyValue('--dur-expand')),
    easing: root.getPropertyValue('--ease-out').trim(),
    fadeMs: Number.parseFloat(root.getPropertyValue(reducedMotion ? '--dur-fast' : '--dur-base')),
  };
}

function totalDuration(animations: FlipAnimations): number {
  return Math.max(...[animations.surface, animations.content].map((animation) => Number(animation.effect!.getComputedTiming().endTime)));
}

function focusActivityTitle(content: HTMLElement): void {
  content.querySelector<HTMLElement>('[data-activity-title]')?.focus({ preventScroll: true });
}

function focusOrigin(origin: HTMLElement | null): void {
  const target = origin?.matches(FOCUSABLE_ORIGIN) ? origin : origin?.querySelector<HTMLElement>(FOCUSABLE_ORIGIN);
  target?.focus({ preventScroll: true });
}

/**
 * Motion state machine between the resting states and the activity. Owns the FLIP transitions: a navigation during a
 * transition reverses it from its current progress, and a safety timeout forces the final state if it never settles.
 */
export function createMotionCoordinator(): MotionCoordinator {
  let state: MotionState = 'INTRO';
  let transition: Transition | undefined;
  const listeners = new Set<(state: MotionState) => void>();

  function setState(next: MotionState): void {
    if (next === state) {
      return;
    }
    state = next;
    listeners.forEach((listener) => listener(next));
  }

  function animationsOf(current: Transition): Animation[] {
    return [current.animations.surface, current.animations.content];
  }

  function armTimer(current: Transition): void {
    clearTimeout(current.timer);
    current.timer = setTimeout(() => {
      current.animations.surface.onfinish = null;
      animationsOf(current).forEach((animation) => animation.finish());
      settle(current);
    }, current.timeoutMs);
  }

  function settle(current: Transition): void {
    if (transition !== current) {
      return;
    }
    transition = undefined;
    clearTimeout(current.timer);
    if (current.direction === 'forward') {
      animationsOf(current).forEach((animation) => animation.cancel());
      setState('ACTIVITY');
      focusActivityTitle(current.elements.content);
    } else {
      setState(current.returnTarget);
      focusOrigin(current.elements.origin);
    }
    current.resolve();
  }

  function start(direction: Direction, elements: FlipElements, returnTarget: RestingState): Promise<void> {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations = expandFromOrigin(elements, readTiming(reducedMotion), reducedMotion);
    let resolve!: () => void;
    const promise = new Promise<void>((done) => (resolve = done));
    const current: Transition = {
      direction,
      returnTarget,
      elements,
      animations,
      timeoutMs: totalDuration(animations) * SAFETY_FACTOR,
      promise,
      resolve,
    };
    if (direction === 'backward') {
      animationsOf(current).forEach((animation) => animation.reverse());
    }
    animations.surface.onfinish = () => settle(current);
    transition = current;
    armTimer(current);
    setState(direction === 'forward' ? 'ACTIVITY_TRANSITION' : 'RETURN_TRANSITION');
    return promise;
  }

  function reverse(current: Transition, target: RestingState): void {
    current.direction = current.direction === 'forward' ? 'backward' : 'forward';
    if (target !== 'ACTIVITY') {
      current.returnTarget = target;
    }
    animationsOf(current).forEach((animation) => animation.reverse());
    armTimer(current);
    setState(current.direction === 'forward' ? 'ACTIVITY_TRANSITION' : 'RETURN_TRANSITION');
  }

  function abort(): void {
    if (!transition) {
      return;
    }
    const current = transition;
    transition = undefined;
    clearTimeout(current.timer);
    current.animations.surface.onfinish = null;
    animationsOf(current).forEach((animation) => animation.cancel());
    current.resolve();
  }

  return {
    get state() {
      return state;
    },
    resolveInitial(next) {
      abort();
      setState(next);
    },
    go(target, elements) {
      const toActivity = target === 'ACTIVITY';
      if (transition) {
        if (toActivity !== (transition.direction === 'forward')) {
          reverse(transition, target);
        } else if (!toActivity) {
          transition.returnTarget = target;
        }
        return transition.promise;
      }
      if (toActivity === (state === 'ACTIVITY')) {
        setState(target);
        return Promise.resolve();
      }
      if (!elements) {
        setState(target);
        return Promise.resolve();
      }
      return start(toActivity ? 'forward' : 'backward', elements, toActivity ? (state as RestingState) : target);
    },
    cancelTo(next) {
      abort();
      setState(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const motionCoordinator = createMotionCoordinator();
