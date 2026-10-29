import { readFile } from 'node:fs';

export type Callback<T> = (error: Error | null, value?: T) => void;

export interface Settings {
  theme: string;
  pageSize: number;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'light', pageSize: 20 };

export function promisify<T>(fn: (...args: any[]) => void): (...args: any[]) => Promise<T> {
  return (...args) =>
    new Promise<T>((resolve, reject) => {
      fn(...args, (error: Error | null, value: T) => (error ? reject(error) : resolve(value)));
    });
}

export function readJson(path: string, callback: Callback<unknown>): void {
  readFile(path, 'utf8', (error, text) => {
    if (error) {
      return callback(error);
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return callback(parseError as Error);
    }
    callback(null, data);
  });
}

export const readJsonAsync = promisify<unknown>(readJson);

export async function loadSettings(path: string): Promise<Settings> {
  try {
    const data = (await readJsonAsync(path)) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }
}

async function main() {
  console.log(await loadSettings('settings.json'));
}

main();
