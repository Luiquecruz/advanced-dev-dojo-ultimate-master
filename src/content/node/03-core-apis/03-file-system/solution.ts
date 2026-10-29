import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface Note {
  id: number;
  text: string;
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await rename(temporary, path);
}

export async function addNote(path: string, text: string): Promise<Note> {
  const notes = await readJson<Note[]>(path, []);
  const note = { id: Math.max(0, ...notes.map((existing) => existing.id)) + 1, text };
  await writeJsonAtomic(path, [...notes, note]);
  return note;
}

async function main() {
  await addNote('demo/notes.json', 'Buy milk');
  await addNote('demo/notes.json', 'Write the fs lesson');
  console.log(await readFile('demo/notes.json', 'utf8'));
}

main();
