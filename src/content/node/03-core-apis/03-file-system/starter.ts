import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface Note {
  id: number;
  text: string;
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  // TODO: parse the file, return fallback only for ENOENT and rethrow anything else
  return fallback;
}

export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  // TODO: create the parent folder, write a temporary file, then rename it over path
}

export async function addNote(path: string, text: string): Promise<Note> {
  // TODO: read the notes, append the new one with the next id and save atomically
  return { id: 0, text };
}

async function main() {
  await addNote('demo/notes.json', 'Buy milk');
  await addNote('demo/notes.json', 'Write the fs lesson');
  console.log(await readFile('demo/notes.json', 'utf8'));
}

main();
