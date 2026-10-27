import clsx from 'clsx';

type ButtonVariant = 'primary' | 'ghost' | 'warning';
type ButtonSize = 'regular' | 'small';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:brightness-110',
  ghost: 'border-line-strong bg-transparent text-ink hover:bg-hover',
  warning: 'border-line-strong bg-transparent text-warning hover:bg-hover',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  regular: 'h-9 px-3.5 text-sm',
  small: 'h-7 px-2.5 text-xs',
};

/**
 * Classes of a text button or button-like link.
 */
export function buttonClass(variant: ButtonVariant, size: ButtonSize = 'regular', extra?: string): string {
  return clsx(
    'inline-flex cursor-pointer items-center gap-2 rounded-md border font-semibold whitespace-nowrap transition-[background-color,border-color,filter,transform] duration-(--dur-fast) active:translate-y-px disabled:cursor-progress disabled:opacity-60',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    extra,
  );
}

/**
 * Classes of a square icon-only button or link.
 */
export function iconButtonClass(disabled = false, extra?: string): string {
  return clsx(
    'inline-grid size-8.5 cursor-pointer place-items-center rounded-md border border-transparent bg-transparent text-ink-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-ink',
    disabled && 'pointer-events-none opacity-30',
    extra,
  );
}

const TAG_TONES: Record<string, string> = {
  legacy: 'bg-warning/12 text-warning',
  new: 'bg-success/12 text-success',
  'react-19': 'bg-success/12 text-success',
  theory: 'bg-theory/12 text-theory',
  quiz: 'bg-theory/12 text-theory',
};

/**
 * Classes of a small uppercase tag, toned by its name.
 */
export function tagClass(tag: string): string {
  return clsx('rounded px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] uppercase', TAG_TONES[tag] ?? 'bg-hover text-ink-muted');
}

export const SUCCESS_BADGE_CLASS = 'inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success [&_svg]:size-3.25';

export const SECTION_TITLE_CLASS = 'mt-7 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase';

export const TEST_MESSAGE_CLASS = 'mt-1.5 rounded-md bg-danger/10 px-2.5 py-2 font-mono text-xs/normal whitespace-pre-wrap text-danger-soft wrap-anywhere';

export const COMPILE_ERROR_CLASS = 'mb-2 rounded-md bg-danger/10 px-2.5 py-2 font-mono text-xs/normal whitespace-pre-wrap text-danger-soft wrap-anywhere';
