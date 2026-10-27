import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMotionCoordinator } from './coordinator';
import type { FlipElements } from './flip';

const DURATION_MS = 520;

class FakeAnimation {
  onfinish: (() => void) | null = null;
  playbackRate = 1;
  reverse = vi.fn(() => {
    this.playbackRate *= -1;
  });
  cancel = vi.fn();
  finish = vi.fn();
  effect = { getComputedTiming: () => ({ endTime: DURATION_MS }) };
}

function createElements(): FlipElements & { title: HTMLElement; originLink: HTMLAnchorElement } {
  const surface = document.createElement('div');
  const content = document.createElement('div');
  const title = document.createElement('h1');
  title.tabIndex = -1;
  title.setAttribute('data-activity-title', '');
  content.append(title);
  const origin = document.createElement('article');
  const originLink = document.createElement('a');
  originLink.href = '#';
  origin.append(originLink);
  document.body.append(surface, content, origin);
  return { surface, content, origin, title, originLink };
}

describe('createMotionCoordinator', () => {
  let animations: FakeAnimation[];

  beforeEach(() => {
    animations = [];
    HTMLElement.prototype.animate = vi.fn(() => {
      const animation = new FakeAnimation();
      animations.push(animation);
      return animation as unknown as Animation;
    });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('switches resting states without animating and notifies subscribers', () => {
    const coordinator = createMotionCoordinator();
    const listener = vi.fn();
    coordinator.subscribe(listener);
    void coordinator.go('CURRICULUM');
    expect(coordinator.state).toBe('CURRICULUM');
    expect(listener).toHaveBeenCalledWith('CURRICULUM');
    expect(animations).toHaveLength(0);
  });

  it('resolves a direct load straight into the activity', () => {
    const coordinator = createMotionCoordinator();
    coordinator.resolveInitial('ACTIVITY');
    expect(coordinator.state).toBe('ACTIVITY');
  });

  it('expands into the activity and focuses the lesson title', async () => {
    const coordinator = createMotionCoordinator();
    coordinator.resolveInitial('CURRICULUM');
    const elements = createElements();
    const done = coordinator.go('ACTIVITY', elements);
    expect(coordinator.state).toBe('ACTIVITY_TRANSITION');
    animations[0].onfinish!();
    await done;
    expect(coordinator.state).toBe('ACTIVITY');
    expect(document.activeElement).toBe(elements.title);
    animations.forEach((animation) => expect(animation.cancel).toHaveBeenCalled());
  });

  it('reverses a running expansion and returns focus to the origin', async () => {
    const coordinator = createMotionCoordinator();
    coordinator.resolveInitial('CURRICULUM');
    const elements = createElements();
    const done = coordinator.go('ACTIVITY', elements);
    void coordinator.go('CURRICULUM');
    expect(coordinator.state).toBe('RETURN_TRANSITION');
    animations.forEach((animation) => expect(animation.reverse).toHaveBeenCalledOnce());
    animations[0].onfinish!();
    await done;
    expect(coordinator.state).toBe('CURRICULUM');
    expect(document.activeElement).toBe(elements.originLink);
  });

  it('forces the final state when the animation never finishes', async () => {
    vi.useFakeTimers();
    const coordinator = createMotionCoordinator();
    coordinator.resolveInitial('CURRICULUM');
    const done = coordinator.go('ACTIVITY', createElements());
    vi.advanceTimersByTime(DURATION_MS * 2);
    await done;
    expect(coordinator.state).toBe('ACTIVITY');
  });

  it('cancelTo leaves any transition and settles immediately', () => {
    const coordinator = createMotionCoordinator();
    coordinator.resolveInitial('CURRICULUM');
    void coordinator.go('ACTIVITY', createElements());
    coordinator.cancelTo('CURRICULUM');
    expect(coordinator.state).toBe('CURRICULUM');
    animations.forEach((animation) => expect(animation.cancel).toHaveBeenCalled());
  });
});
