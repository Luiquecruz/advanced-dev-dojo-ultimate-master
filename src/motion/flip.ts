export interface FlipElements {
  surface: HTMLElement;
  content: HTMLElement;
  origin: HTMLElement | null;
}

export interface FlipTiming {
  durationMs: number;
  easing: string;
  fadeMs: number;
}

export interface FlipAnimations {
  surface: Animation;
  content: Animation;
}

const CONTENT_FADE_MS = 200;
const CONTENT_START_PROGRESS = 0.6;

function crossfade({ surface, content }: FlipElements, durationMs: number): FlipAnimations {
  const keyframes = [{ opacity: 0 }, { opacity: 1 }];
  return {
    surface: surface.animate(keyframes, { duration: durationMs, easing: 'linear', fill: 'both' }),
    content: content.animate(keyframes, { duration: durationMs, easing: 'linear', fill: 'both' }),
  };
}

/**
 * Expansion from the origin element to the surface's final layout (First, Last, Invert, Play).
 * Only the surface is translated and scaled, with the corner radius compensated through `clip-path`; the content is never
 * scaled and fades in from 60% of the progress. Without an origin, or with reduced motion, it degrades to a crossfade.
 * Play it backwards with `reverse()` to collapse back to the origin.
 */
export function expandFromOrigin(elements: FlipElements, timing: FlipTiming, reducedMotion: boolean): FlipAnimations {
  const { surface, content, origin } = elements;
  if (reducedMotion || !origin) {
    return crossfade(elements, timing.fadeMs);
  }
  const first = origin.getBoundingClientRect();
  const last = surface.getBoundingClientRect();
  const scaleX = first.width / last.width;
  const scaleY = first.height / last.height;
  const radius = Number.parseFloat(getComputedStyle(origin).borderTopLeftRadius);

  return {
    surface: surface.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${scaleX}, ${scaleY})`,
          clipPath: `inset(0px round ${radius / scaleX}px / ${radius / scaleY}px)`,
        },
        { transformOrigin: '0 0', transform: 'none', clipPath: 'inset(0px round 0px / 0px)' },
      ],
      { duration: timing.durationMs, easing: timing.easing, fill: 'both' },
    ),
    content: content.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: CONTENT_FADE_MS,
      delay: timing.durationMs * CONTENT_START_PROGRESS,
      easing: 'linear',
      fill: 'both',
    }),
  };
}
