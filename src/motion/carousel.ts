export interface CarouselDragOptions {
  slideWidth(): number;
  onDrag(slides: number): void;
  onRelease(steps: number): void;
}

const DRAG_INTENT_PX: Record<string, number> = { mouse: 12, pen: 12, touch: 10 };
const CLICK_SLOP_PX = 16;
const FLICK_MIN_TRAVEL_PX = 24;
const FLICK_VELOCITY_PX_PER_MS = 0.45;

/**
 * Horizontal drag and swipe for a carousel. Reports the drag as a fractional number of slides (positive when dragging
 * right) and, on release, the whole number of slides to move, including a one-step flick. Vertical drags are left to the
 * browser (pair with `touch-action: pan-y`). Small pointer wobble during a click never counts as a drag: the click that ends
 * a drag is only swallowed when the pointer really travelled.
 */
export function bindCarouselDrag(element: HTMLElement, { slideWidth, onDrag, onRelease }: CarouselDragOptions): () => void {
  let pointerId: number | undefined;
  let intent: 'undecided' | 'drag' | 'scroll' = 'undecided';
  let intentDistance = DRAG_INTENT_PX.mouse;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let width = 1;
  let swallowClick = false;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerId !== undefined) {
      return;
    }
    pointerId = event.pointerId;
    intent = 'undecided';
    swallowClick = false;
    intentDistance = DRAG_INTENT_PX[event.pointerType] ?? DRAG_INTENT_PX.mouse;
    startX = lastX = event.clientX;
    startY = event.clientY;
    lastTime = event.timeStamp;
    velocity = 0;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    const deltaX = event.clientX - startX;
    if (intent === 'undecided') {
      if (Math.hypot(deltaX, event.clientY - startY) < intentDistance) {
        return;
      }
      intent = Math.abs(deltaX) > Math.abs(event.clientY - startY) ? 'drag' : 'scroll';
      if (intent === 'drag') {
        width = slideWidth();
        element.setPointerCapture(event.pointerId);
        element.setAttribute('data-dragging', '');
      }
    }
    if (intent !== 'drag') {
      return;
    }
    const elapsed = event.timeStamp - lastTime;
    if (elapsed > 0) {
      velocity = (event.clientX - lastX) / elapsed;
    }
    lastX = event.clientX;
    lastTime = event.timeStamp;
    onDrag(deltaX / width);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    pointerId = undefined;
    if (intent !== 'drag') {
      return;
    }
    element.removeAttribute('data-dragging');
    const travel = lastX - startX;
    swallowClick = event.type === 'pointerup' && Math.abs(travel) >= CLICK_SLOP_PX;
    const steps = Math.round(travel / width);
    const flick = steps === 0 && Math.abs(travel) >= FLICK_MIN_TRAVEL_PX && Math.abs(velocity) > FLICK_VELOCITY_PX_PER_MS;
    onRelease(flick ? Math.sign(velocity) : steps);
  };

  const onClickCapture = (event: MouseEvent) => {
    if (swallowClick) {
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onDragStart = (event: DragEvent) => event.preventDefault();

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerEnd);
  element.addEventListener('pointercancel', onPointerEnd);
  element.addEventListener('click', onClickCapture, true);
  element.addEventListener('dragstart', onDragStart);
  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerEnd);
    element.removeEventListener('pointercancel', onPointerEnd);
    element.removeEventListener('click', onClickCapture, true);
    element.removeEventListener('dragstart', onDragStart);
  };
}
