import clsx from 'clsx';

/**
 * Horizontal progress bar filled with the current accent.
 */
export function ProgressBar({ percent, label, large = false }: { percent: number; label?: string; large?: boolean }) {
  return (
    <div className={clsx('overflow-hidden rounded-full bg-hover', large ? 'h-2 min-w-40 flex-1' : 'h-1.5')} role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className="block h-full rounded-[inherit] bg-accent transition-[width] duration-400 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}
