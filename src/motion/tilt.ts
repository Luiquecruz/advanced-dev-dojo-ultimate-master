export interface TiltLimits {
  x: number;
  y: number;
}

export interface TiltController {
  setTarget(horizontal: number, vertical: number): void;
  reset(): void;
  destroy(): void;
}

interface TiltState {
  element: HTMLElement;
  limits: TiltLimits;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
}

export const DESKTOP_TILT_LIMITS: TiltLimits = { x: 4, y: 6 };
export const MOBILE_TILT_LIMITS: TiltLimits = { x: 2, y: 3 };

const SMOOTHING_RATE = 8;
const SETTLE_THRESHOLD = 0.01;
const TILTING_THRESHOLD = 0.05;
const GLOW_TRAVEL_PERCENT = 40;
const MAX_DELTA_SECONDS = 0.1;
const DEFAULT_DELTA_SECONDS = 1 / 60;
const TOUCH_INTENT_DISTANCE = 6;

const active = new Set<TiltState>();
let frame: number | undefined;
let lastTime: number | undefined;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function write(state: TiltState): void {
  const { element, limits, currentX, currentY } = state;
  element.style.setProperty('--tilt-x', currentX.toFixed(3));
  element.style.setProperty('--tilt-y', currentY.toFixed(3));
  element.style.setProperty('--glow-x', `${(50 + (currentY / limits.y) * GLOW_TRAVEL_PERCENT).toFixed(1)}%`);
  element.style.setProperty('--glow-y', `${(50 + (currentX / limits.x) * GLOW_TRAVEL_PERCENT).toFixed(1)}%`);
  element.toggleAttribute('data-tilting', Math.abs(currentX) > TILTING_THRESHOLD || Math.abs(currentY) > TILTING_THRESHOLD);
}

function tick(time: number): void {
  const delta = lastTime === undefined ? DEFAULT_DELTA_SECONDS : Math.min((time - lastTime) / 1000, MAX_DELTA_SECONDS);
  lastTime = time;
  const smoothing = 1 - Math.exp(-delta * SMOOTHING_RATE);
  for (const state of active) {
    state.currentX += (state.targetX - state.currentX) * smoothing;
    state.currentY += (state.targetY - state.currentY) * smoothing;
    if (Math.abs(state.targetX - state.currentX) <= SETTLE_THRESHOLD && Math.abs(state.targetY - state.currentY) <= SETTLE_THRESHOLD) {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      active.delete(state);
    }
    write(state);
  }
  if (active.size > 0) {
    frame = requestAnimationFrame(tick);
    return;
  }
  frame = undefined;
  lastTime = undefined;
}

function wake(state: TiltState): void {
  active.add(state);
  frame ??= requestAnimationFrame(tick);
}

/**
 * Smoothed tilt of a group of cards, written as `--tilt-x`/`--tilt-y` (degrees) and `--glow-x`/`--glow-y` on the element.
 * Every controller shares one animation frame loop that only runs while some tilt is still moving.
 */
export function createTilt(element: HTMLElement, limits: TiltLimits): TiltController {
  const state: TiltState = { element, limits, targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
  write(state);
  return {
    setTarget(horizontal, vertical) {
      state.targetX = clampUnit(vertical) * limits.x;
      state.targetY = clampUnit(horizontal) * limits.y;
      wake(state);
    },
    reset() {
      state.targetX = 0;
      state.targetY = 0;
      wake(state);
    },
    destroy() {
      active.delete(state);
      for (const property of ['--tilt-x', '--tilt-y', '--glow-x', '--glow-y']) {
        element.style.removeProperty(property);
      }
      element.removeAttribute('data-tilting');
    },
  };
}

function normalizedPosition(element: HTMLElement, event: PointerEvent): [horizontal: number, vertical: number] {
  const rect = element.getBoundingClientRect();
  return [((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1];
}

/**
 * Drives a tilt from mouse and pen movement over the element, relative to its center.
 */
export function bindPointerTilt(element: HTMLElement, controller: TiltController): () => void {
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      controller.setTarget(...normalizedPosition(element, event));
    }
  };
  const onPointerLeave = () => controller.reset();
  const onFocusIn = (event: FocusEvent) => {
    if ((event.target as HTMLElement).matches(':focus-visible')) {
      controller.reset();
    }
  };
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerleave', onPointerLeave);
  element.addEventListener('focusin', onFocusIn);
  return () => {
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerleave', onPointerLeave);
    element.removeEventListener('focusin', onFocusIn);
  };
}

/**
 * Touch fallback: a mostly horizontal drag over the element drives the tilt, releasing returns it to the center.
 * Vertical drags are left to the browser so scrolling keeps working (pair with `touch-action: pan-y`).
 */
export function bindTouchTilt(element: HTMLElement, controller: TiltController): () => void {
  let pointerId: number | undefined;
  let startX = 0;
  let startY = 0;
  let intent: 'undecided' | 'tilt' | 'scroll' = 'undecided';

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || pointerId !== undefined) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    intent = 'undecided';
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (intent === 'undecided') {
      if (Math.hypot(deltaX, deltaY) < TOUCH_INTENT_DISTANCE) {
        return;
      }
      intent = Math.abs(deltaX) > Math.abs(deltaY) ? 'tilt' : 'scroll';
    }
    if (intent === 'tilt') {
      controller.setTarget(...normalizedPosition(element, event));
    }
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    pointerId = undefined;
    controller.reset();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerEnd);
  element.addEventListener('pointercancel', onPointerEnd);
  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerEnd);
    element.removeEventListener('pointercancel', onPointerEnd);
  };
}
