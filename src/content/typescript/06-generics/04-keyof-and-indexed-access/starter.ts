interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  autosave: boolean;
}

// TODO: add as const so the role names are kept as literals
const ROLES = ['admin', 'editor', 'viewer'];

// TODO: derive these types with keyof, indexed access and typeof ROLES[number]
type SettingKey = string;
type ThemeValue = string;
type Role = string;

// TODO: type the key with keyof and the value with T[K]
function getProperty(obj: any, key: string): unknown {
  return obj[key];
}

function setProperty(obj: any, key: string, value: unknown): void {
  obj[key] = value;
}

function pluck(items: readonly any[], key: string): unknown[] {
  return items.map((item) => item[key]);
}
