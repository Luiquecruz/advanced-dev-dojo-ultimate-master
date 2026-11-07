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

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly storage = inject(STORAGE);

  // TODO: load from storage ('prefs') with the version-1 migration and safe defaults

  // TODO: read-only `preferences`

  setTheme(theme: Preferences['theme']) {
    // TODO
  }

  setFontSize(size: number) {
    // TODO: clamp between 12 and 24
  }
}
