import type { LanguageId } from '@/content';
import { ChevronRightIcon } from '@/shared/ui/icons';

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
 * Native select that picks the language of a multi-language challenge, marking the languages already passed.
 */
export function LanguageSwitch({ options, value, onChange }: LanguageSwitchProps) {
  return (
    <div className="relative inline-flex flex-none items-center">
      <select
        aria-label="Challenge language"
        value={value}
        onChange={(event) => onChange(event.target.value as LanguageId)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-code pr-8 pl-2.5 text-[13px] font-semibold text-ink hover:border-line-strong max-wide:text-base"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.passed ? `${option.label} (passed)` : option.label}
          </option>
        ))}
      </select>
      <ChevronRightIcon className="pointer-events-none absolute right-2.5 size-3.5 rotate-90 text-ink-muted" aria-hidden="true" />
    </div>
  );
}
