interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  autosave: boolean;
}

const ROLES = ['admin', 'editor', 'viewer'] as const;

type SettingKey = keyof Settings;
type ThemeValue = Settings['theme'];
type Role = (typeof ROLES)[number];

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}

function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
