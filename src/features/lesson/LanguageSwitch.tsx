import clsx from 'clsx';
import type { LanguageId } from '@/content';
import { CheckIcon } from '@/shared/ui/icons';

export interface LanguageOption {
  id: LanguageId;
  label: string;
  passed: boolean;
}

interface LanguageSwitchProps {
  options: LanguageOption[];
  value: LanguageId;
  onChange(language: LanguageId): void;
}

/**
 * Segmented control that picks the language of a multi-language challenge, marking the languages already passed.
 */
export function LanguageSwitch({ options, value, onChange }: LanguageSwitchProps) {
  return (
    <div role="group" aria-label="Challenge language" className="flex items-center gap-0.5 rounded-lg border border-line bg-code p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          className={clsx(
            'inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-md bg-transparent px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap',
            option.id === value ? 'bg-hover text-ink' : 'text-ink-muted hover:text-ink',
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.passed && <CheckIcon className="text-success" role="img" aria-label="Passed" />}
        </button>
      ))}
    </div>
  );
}
