import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';

interface RotatingWordsProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

const DEFAULT_INTERVAL_MS = 4200;
const LETTER_STAGGER_MS = 55;

function randomOther(current: number, count: number): number {
  const next = Math.floor(Math.random() * (count - 1));
  return next >= current ? next + 1 : next;
}

/**
 * Display text that shows one word at a time, in random order. The leaving word sinks and blurs out letter by letter
 * while the next one rises in; all words share one grid cell so the layout never shifts. Decorative: it is hidden from
 * assistive technology (give the parent an accessible name), pauses while hovered or in a hidden tab, and stays
 * on the first word with reduced motion.
 */
export function RotatingWords({ words, intervalMs = DEFAULT_INTERVAL_MS, className }: RotatingWordsProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (paused || reducedMotion) {
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        setIndex((current) => randomOther(current, words.length));
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, words.length, intervalMs]);

  return (
    <span
      aria-hidden="true"
      className={clsx('grid', className)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {words.map((word, wordIndex) => {
        let letter = 0;
        return (
          <span key={word} data-active={wordIndex === index || undefined} className="group/word col-start-1 row-start-1 self-center">
            {word.split(' ').map((part, partIndex) => (
              <span key={partIndex}>
                {partIndex > 0 && ' '}
                <span className="inline-block whitespace-nowrap">
                  {[...part].map((char) => (
                    <span
                      key={letter}
                      className="inline-block translate-y-[0.32em] opacity-0 blur-md [transition:opacity_700ms_var(--ease-out),filter_1400ms_var(--ease-out),translate_1400ms_var(--ease-out)] group-data-active/word:translate-y-0 group-data-active/word:opacity-100 group-data-active/word:blur-none motion-reduce:transition-none"
                      style={{ transitionDelay: `${letter++ * LETTER_STAGGER_MS}ms` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
