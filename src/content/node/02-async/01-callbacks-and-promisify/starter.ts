import { readFile } from 'node:fs';

export type Callback<T> = (error: Error | null, value?: T) => void;

export interface Settings {
  theme: string;
  pageSize: number;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'light', pageSize: 20 };

export function promisify<T>(fn: (...args: any[]) => void): (...args: any[]) => Promise<T> {
  // TODO: return a function that calls fn with the same arguments plus an error-first callback, and settles a Promise from it
  return () => Promise.reject(new Error('promisify is not implemented yet'));
}

export function readJson(path: string, callback: Callback<unknown>): void {
  // TODO: read the file with readFile(path, 'utf8', ...), parse it, and call callback exactly once with the error or the data
}

export const readJsonAsync = promisify<unknown>(readJson);

export async function loadSettings(path: string): Promise<Settings> {
  // TODO: await readJsonAsync, merge the result over DEFAULT_SETTINGS, return the defaults on ENOENT and rethrow other errors
  return DEFAULT_SETTINGS;
}

async function main() {
  console.log(await loadSettings('settings.json'));
}

main();
