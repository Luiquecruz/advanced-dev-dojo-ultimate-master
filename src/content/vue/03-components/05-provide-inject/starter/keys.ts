import type { InjectionKey, Ref } from 'vue';

export interface ThemeContext {
  theme: Readonly<Ref<'light' | 'dark'>>;
  toggle: () => void;
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme');
