import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export interface Preferences {
  theme: 'light' | 'dark';
  fontSize: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE = new InjectionToken<StorageLike>('STORAGE');

const DEFAULTS: Preferences = { theme: 'light', fontSize: 16 };

function read(storage: StorageLike): Preferences {
  try {
    const envelope = JSON.parse(storage.getItem('prefs') ?? 'null');
    if (envelope?.version === 1) {
      return { theme: envelope.data?.dark === true ? 'dark' : 'light', fontSize: 16 };
    }
    if (envelope?.version === 2) {
      const { theme, fontSize } = envelope.data ?? {};
      if ((theme === 'light' || theme === 'dark') && typeof fontSize === 'number') return { theme, fontSize };
    }
  } catch {
    return DEFAULTS;
  }
  return DEFAULTS;
}

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly storage = inject(STORAGE);
  private readonly state = signal<Preferences>(read(this.storage));

  readonly preferences = this.state.asReadonly();

  setTheme(theme: Preferences['theme']) {
    this.state.update((state) => ({ ...state, theme }));
    this.persist();
  }

  setFontSize(size: number) {
    this.state.update((state) => ({ ...state, fontSize: Math.min(24, Math.max(12, size)) }));
    this.persist();
  }

  private persist() {
    this.storage.setItem('prefs', JSON.stringify({ version: 2, data: this.state() }));
  }
}
