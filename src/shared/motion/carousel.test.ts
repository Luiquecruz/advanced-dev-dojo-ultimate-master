import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindCarouselDrag } from './carousel';

const SLIDE_WIDTH = 380;

function pointer(element: HTMLElement, type: string, clientX: number, clientY = 0, pointerType = 'mouse') {
  element.dispatchEvent(new PointerEvent(type, { clientX, clientY, pointerId: 1, pointerType, button: 0, bubbles: true }));
}

describe('bindCarouselDrag', () => {
  let element: HTMLElement;
  let link: HTMLAnchorElement;
  const onDrag = vi.fn();
  const onRelease = vi.fn();

  beforeEach(() => {
    onDrag.mockReset();
    onRelease.mockReset();
    element = document.createElement('div');
    element.setPointerCapture = vi.fn();
    link = document.createElement('a');
    element.append(link);
    document.body.append(element);
    bindCarouselDrag(element, { slideWidth: () => SLIDE_WIDTH, onDrag, onRelease });
  });

  it('treats pointer wobble during a click as a click', () => {
    pointer(link, 'pointerdown', 100);
    pointer(link, 'pointermove', 108);
    pointer(link, 'pointerup', 108);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(onDrag).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it('reports the drag in slides and releases to the nearest slide', () => {
    pointer(link, 'pointerdown', 500);
    pointer(link, 'pointermove', 400);
    pointer(link, 'pointermove', 200);
    pointer(link, 'pointerup', 200);
    expect(onDrag).toHaveBeenLastCalledWith(-300 / SLIDE_WIDTH);
    expect(onRelease).toHaveBeenCalledWith(-1);
  });

  it('swallows the click that ends a real drag', () => {
    pointer(link, 'pointerdown', 500);
    pointer(link, 'pointermove', 440);
    pointer(link, 'pointerup', 440);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it('leaves vertical drags to the browser', () => {
    pointer(link, 'pointerdown', 100, 100, 'touch');
    pointer(link, 'pointermove', 104, 160, 'touch');
    pointer(link, 'pointerup', 104, 160, 'touch');
    expect(onDrag).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });
});
