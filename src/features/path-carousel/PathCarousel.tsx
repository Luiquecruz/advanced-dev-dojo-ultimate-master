import clsx from 'clsx';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import type { Track } from '@/content';
import { summarizeTrack, useProgress } from '@/entities/progress';
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@/shared/ui/icons';
import { buttonClass } from '@/shared/ui/classNames';
import { bindCarouselDrag } from '@/shared/motion/carousel';
import { PathCard } from './PathCard';
import { useTiltGroup } from './useTiltGroup';

interface PathCarouselProps {
  tracks: Track[];
  active: number;
  onActiveChange(index: number): void;
}

const STAGE_HEIGHT_PX = 660;
const ARROW_CLASS =
  'group/arrow absolute top-1/2 z-20 grid h-14 w-14 -translate-y-1/2 place-items-center text-ink-faint transition-colors duration-(--dur-base) hover:text-accent focus-visible:text-accent max-wide:hidden';
const ENTER_BASE_DELAY_MS = 260;
const ENTER_STEP_MS = 120;

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

function circularOffset(index: number, active: number, count: number): number {
  const half = Math.floor(count / 2);
  return wrapIndex(index - active + half, count) - half;
}

/**
 * 3D carousel of the learning paths: the active card faces the viewer, the neighbours recede at an angle. Navigates by
 * swipe or drag, keyboard arrows, the side arrows, the progress segments or a click beside the active card (the cursor
 * turns into a prev/next arrow there). Only the active slide
 * receives pointer events and is exposed to assistive technology. The 3D containers (stage, slides) never take part in
 * hit-testing: they are coplanar with the cards, and coplanar 3D planes hit-test unpredictably (it varies with the
 * perspective, the fit scale and the window size), which swallowed clicks on the card buttons.
 * The stage scales down to fit the height it is given, and the cards rise into place on mount (a transform/opacity
 * keyframe, so it runs on the compositor). Per-frame values (`--drag`, `--slide-*`) are non-inheriting registered
 * properties written on the slides themselves, so a drag never restyles the card subtrees.
 */
export function PathCarousel({ tracks, active, onActiveChange }: PathCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const initialActive = useRef(active);
  const [fit, setFit] = useState(1);
  const { gyroSupported, gyroStatus, toggleGyro } = useTiltGroup(viewportRef);
  const count = tracks.length;
  const state = useProgress();
  const percents = useMemo(() => tracks.map((track) => summarizeTrack(track, state).percent), [tracks, state]);
  activeRef.current = active;
  const go = (index: number) => onActiveChange(wrapIndex(index, count));

  useLayoutEffect(() => {
    const viewport = viewportRef.current!;
    const observer = new ResizeObserver(() => setFit(Math.min(1, viewport.clientHeight / STAGE_HEIGHT_PX)));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current!;
    const setDrag = (slides: number) => stage.querySelectorAll<HTMLElement>('[data-slide]').forEach((slide) => slide.style.setProperty('--drag', slides.toFixed(4)));
    return bindCarouselDrag(viewportRef.current!, {
      slideWidth: () => stage.querySelector<HTMLElement>('[data-slide-active]')!.offsetWidth,
      onDrag: setDrag,
      onRelease: (steps) => {
        flushSync(() => onActiveChange(wrapIndex(activeRef.current - steps, count)));
        setDrag(0);
      },
    });
  }, [count, onActiveChange]);

  const sideOf = (clientX: number, target: EventTarget): 'prev' | 'next' | undefined => {
    const activeSlide = stageRef.current!.querySelector<HTMLElement>('[data-slide-active]')!;
    if (activeSlide.contains(target as Node)) {
      return undefined;
    }
    const rect = activeSlide.getBoundingClientRect();
    return clientX < rect.left ? 'prev' : clientX > rect.right ? 'next' : undefined;
  };

  const onViewportClick = (event: MouseEvent) => {
    const side = sideOf(event.clientX, event.target);
    if (side) {
      go(side === 'prev' ? active - 1 : active + 1);
    }
  };

  const onViewportPointerMove = (event: PointerEvent) => {
    const side = event.pointerType === 'mouse' ? sideOf(event.clientX, event.target) : undefined;
    if (viewportRef.current!.dataset.side !== side) {
      if (side) {
        viewportRef.current!.dataset.side = side;
      } else {
        delete viewportRef.current!.dataset.side;
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: count - 1 };
    if (event.key in moves) {
      event.preventDefault();
      go(moves[event.key]);
    }
  };

  return (
    <section aria-roledescription="carousel" aria-label="Learning paths" onKeyDown={onKeyDown} className="relative flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 max-wide:-mx-4 max-wide:max-h-[660px]">
        <div
          ref={viewportRef}
          onClick={onViewportClick}
          onPointerMove={onViewportPointerMove}
          onPointerLeave={() => delete viewportRef.current!.dataset.side}
          className="absolute inset-0 touch-pan-y overflow-x-clip mask-x-from-88% mask-x-to-100% data-[side=next]:cursor-next data-[side=prev]:cursor-prev max-wide:mask-x-from-92%"
        >
          <div
            ref={stageRef}
            className="pointer-events-none absolute top-1/2 left-0 h-[660px] w-full -translate-y-1/2 touch-pan-y perspective-(--persp) transform-3d select-none [--card-width:400px] [--slide-angle:32deg] [--slide-depth:260px] [--slide-spacing:380px] max-wide:[--card-width:min(86vw,360px)] max-wide:[--slide-angle:22deg] max-wide:[--slide-depth:170px] max-wide:[--slide-spacing:74vw]"
            style={{ scale: fit }}
          >
            {tracks.map((track, index) => {
              const offset = circularOffset(index, active, count);
              const isActive = offset === 0;
              return (
                <div
                  key={track.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${count}: ${track.title}`}
                  aria-hidden={!isActive || undefined}
                  data-slide
                  data-slide-active={isActive || undefined}
                  className="pointer-events-none absolute top-5 left-1/2 h-[620px] w-(--card-width) carousel-slide in-data-dragging:transition-none motion-reduce:transition-none"
                  style={{ ['--slide-base' as string]: offset, zIndex: count - Math.abs(offset) }}
                >
                  <div
                    className="h-full animate-card-in [--slide-distance:inherit] motion-reduce:animate-none"
                    style={{ animationDelay: `${ENTER_BASE_DELAY_MS + Math.abs(circularOffset(index, initialActive.current, count)) * ENTER_STEP_MS}ms` }}
                  >
                    <PathCard track={track} active={isActive} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className={clsx(ARROW_CLASS, 'left-0 cursor-prev')} onClick={() => go(active - 1)} aria-label={`Previous path: ${tracks[wrapIndex(active - 1, count)].title}`}>
          <ArrowLongLeftIcon className="transition-transform duration-(--dur-base) ease-out group-hover/arrow:-translate-x-1.5" />
        </button>
        <button className={clsx(ARROW_CLASS, 'right-0 cursor-next')} onClick={() => go(active + 1)} aria-label={`Next path: ${tracks[wrapIndex(active + 1, count)].title}`}>
          <ArrowLongRightIcon className="transition-transform duration-(--dur-base) ease-out group-hover/arrow:translate-x-1.5" />
        </button>
      </div>

      <div className="flex flex-none flex-wrap items-center justify-center gap-3 pt-2">
        <div className="flex items-center">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              data-trail={track.id}
              aria-label={`Show ${track.title}, ${percents[index]}% complete`}
              aria-current={index === active || undefined}
              onClick={() => go(index)}
              className="group/segment grid h-6 cursor-pointer place-items-center px-0.5"
            >
              <span
                className={clsx(
                  'relative block overflow-hidden rounded-full transition-[width,height,background-color] duration-(--dur-base) ease-out',
                  index === active ? 'h-0.5 w-12 bg-accent/30' : 'h-px w-7 bg-line-strong group-hover/segment:bg-ink-faint',
                )}
              >
                <span className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-(--dur-expand) ease-out" style={{ width: `${percents[index]}%` }} />
              </span>
            </button>
          ))}
        </div>
        {gyroSupported && gyroStatus !== 'unavailable' && (
          <span className="text-xs text-ink-faint">
            {gyroStatus === 'denied' ? (
              <span role="status">Motion access was blocked. Drag across the cards instead.</span>
            ) : (
              <button className={buttonClass('ghost', 'small')} onClick={toggleGyro} aria-pressed={gyroStatus === 'active'}>
                {gyroStatus === 'active' ? 'Disable motion' : 'Enable motion'}
              </button>
            )}
          </span>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {`${tracks[active].title}, path ${active + 1} of ${count}`}
      </p>
    </section>
  );
}
