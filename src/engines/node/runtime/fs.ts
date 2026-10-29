import BufferModule from 'buffer/index.js';
import Stream from 'readable-stream';
import { basename, dirname, resolve } from './path';
import { setTimeout } from './timers';

const { Buffer } = BufferModule;
const { Readable, Writable } = Stream;

type Encoding = BufferEncoding | null | undefined;
type EncodingOption = Encoding | { encoding?: Encoding; flag?: string };
type Data = string | Uint8Array;
type Callback<T> = (error: NodeError | null, value?: T) => void;

interface FileEntry {
  kind: 'file';
  data: Buffer;
  modified: Date;
  created: Date;
}

interface DirectoryEntry {
  kind: 'directory';
  modified: Date;
  created: Date;
}

type Entry = FileEntry | DirectoryEntry;

const MESSAGES: Record<string, string> = {
  ENOENT: 'no such file or directory',
  EEXIST: 'file already exists',
  EISDIR: 'illegal operation on a directory',
  ENOTDIR: 'not a directory',
  ENOTEMPTY: 'directory not empty',
};

const ERRNO: Record<string, number> = { ENOENT: -2, EEXIST: -17, EISDIR: -21, ENOTDIR: -20, ENOTEMPTY: -39 };

/**
 * Error shaped like the ones thrown by Node's fs module.
 */
export class NodeError extends Error {
  readonly errno: number;

  constructor(
    readonly code: string,
    readonly syscall: string,
    readonly path: string,
  ) {
    super(`${code}: ${MESSAGES[code]}, ${syscall} '${path}'`);
    this.errno = ERRNO[code];
  }
}

const volume = new Map<string, Entry>();

function directory(): DirectoryEntry {
  const now = new Date();
  return { kind: 'directory', modified: now, created: now };
}

/**
 * Empties the in-memory file system and recreates `/`, `/app` and `/tmp`.
 */
export function resetFileSystem(): void {
  volume.clear();
  ['/', '/app', '/tmp'].forEach((path) => volume.set(path, directory()));
}

resetFileSystem();

function toPath(path: string | URL): string {
  return resolve(typeof path === 'string' ? path : decodeURIComponent(path.pathname));
}

function encodingOf(options: EncodingOption): Encoding {
  return typeof options === 'string' || options === null || options === undefined ? options : options.encoding;
}

function toBuffer(data: Data, encoding: Encoding = 'utf8'): Buffer {
  return typeof data === 'string' ? Buffer.from(data, encoding ?? 'utf8') : Buffer.from(data);
}

function decode(data: Buffer, encoding: Encoding): string | Buffer {
  return encoding ? data.toString(encoding) : Buffer.from(data);
}

function parentOf(path: string, syscall: string): DirectoryEntry {
  const parent = volume.get(dirname(path));
  if (!parent) {
    throw new NodeError('ENOENT', syscall, path);
  }
  if (parent.kind !== 'directory') {
    throw new NodeError('ENOTDIR', syscall, path);
  }
  return parent;
}

function fileAt(path: string, syscall: string): FileEntry {
  const entry = volume.get(path);
  if (!entry) {
    throw new NodeError('ENOENT', syscall, path);
  }
  if (entry.kind === 'directory') {
    throw new NodeError('EISDIR', syscall, path);
  }
  return entry;
}

function childrenOf(path: string): string[] {
  const prefix = path === '/' ? '/' : `${path}/`;
  return [...volume.keys()].filter((key) => key !== path && key.startsWith(prefix) && !key.slice(prefix.length).includes('/'));
}

function write(path: string, data: Buffer, syscall: string): void {
  const existing = volume.get(path);
  if (existing?.kind === 'directory') {
    throw new NodeError('EISDIR', syscall, path);
  }
  parentOf(path, syscall);
  const now = new Date();
  volume.set(path, { kind: 'file', data, modified: now, created: existing?.created ?? now });
}

/**
 * File metadata returned by stat().
 */
export class Stats {
  readonly size: number;
  readonly mtime: Date;
  readonly birthtime: Date;
  readonly mtimeMs: number;
  readonly mode: number;

  constructor(private readonly entry: Entry) {
    this.size = entry.kind === 'file' ? entry.data.length : 4096;
    this.mtime = entry.modified;
    this.birthtime = entry.created;
    this.mtimeMs = entry.modified.getTime();
    this.mode = entry.kind === 'file' ? 0o100644 : 0o40755;
  }

  isFile(): boolean {
    return this.entry.kind === 'file';
  }

  isDirectory(): boolean {
    return this.entry.kind === 'directory';
  }

  isSymbolicLink(): boolean {
    return false;
  }
}

/**
 * Directory entry returned by readdir() with `withFileTypes`.
 */
export class Dirent {
  constructor(
    readonly name: string,
    readonly parentPath: string,
    private readonly kind: Entry['kind'],
  ) {}

  isFile(): boolean {
    return this.kind === 'file';
  }

  isDirectory(): boolean {
    return this.kind === 'directory';
  }

  isSymbolicLink(): boolean {
    return false;
  }
}

export const constants = { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1, COPYFILE_EXCL: 1 };

export function existsSync(path: string | URL): boolean {
  return volume.has(toPath(path));
}

export function readFileSync(path: string | URL, options?: EncodingOption): any {
  const target = toPath(path);
  return decode(fileAt(target, 'open').data, encodingOf(options));
}

export function writeFileSync(path: string | URL, data: Data, options?: EncodingOption): void {
  const target = toPath(path);
  const flag = typeof options === 'object' && options ? options.flag : undefined;
  if (flag === 'wx' && volume.has(target)) {
    throw new NodeError('EEXIST', 'open', target);
  }
  if (flag === 'a') {
    appendFileSync(target, data, options);
    return;
  }
  write(target, toBuffer(data, encodingOf(options)), 'open');
}

export function appendFileSync(path: string | URL, data: Data, options?: EncodingOption): void {
  const target = toPath(path);
  const existing = volume.get(target);
  const previous = existing?.kind === 'file' ? existing.data : Buffer.alloc(0);
  write(target, Buffer.concat([previous, toBuffer(data, encodingOf(options))]), 'open');
}

export function mkdirSync(path: string | URL, options: { recursive?: boolean } = {}): string | undefined {
  const target = toPath(path);
  if (volume.has(target)) {
    if (options.recursive && volume.get(target)!.kind === 'directory') {
      return undefined;
    }
    throw new NodeError('EEXIST', 'mkdir', target);
  }
  if (!options.recursive) {
    parentOf(target, 'mkdir');
    volume.set(target, directory());
    return undefined;
  }
  const segments = target.split('/').filter(Boolean);
  let first: string | undefined;
  let current = '';
  for (const segment of segments) {
    current = `${current}/${segment}`;
    const entry = volume.get(current);
    if (entry?.kind === 'file') {
      throw new NodeError('ENOTDIR', 'mkdir', target);
    }
    if (!entry) {
      volume.set(current, directory());
      first ??= current;
    }
  }
  return first;
}

export function readdirSync(path: string | URL, options: { withFileTypes?: boolean; recursive?: boolean } = {}): any[] {
  const target = toPath(path);
  const entry = volume.get(target);
  if (!entry) {
    throw new NodeError('ENOENT', 'scandir', target);
  }
  if (entry.kind !== 'directory') {
    throw new NodeError('ENOTDIR', 'scandir', target);
  }
  const prefix = target === '/' ? '/' : `${target}/`;
  const paths = options.recursive ? [...volume.keys()].filter((key) => key !== target && key.startsWith(prefix)) : childrenOf(target);
  return paths.sort().map((child) =>
    options.withFileTypes ? new Dirent(basename(child), dirname(child), volume.get(child)!.kind) : child.slice(prefix.length),
  );
}

export function statSync(path: string | URL, options: { throwIfNoEntry?: boolean } = {}): Stats | undefined {
  const target = toPath(path);
  const entry = volume.get(target);
  if (!entry) {
    if (options.throwIfNoEntry === false) {
      return undefined;
    }
    throw new NodeError('ENOENT', 'stat', target);
  }
  return new Stats(entry);
}

export const lstatSync = statSync;

export function accessSync(path: string | URL): void {
  const target = toPath(path);
  if (!volume.has(target)) {
    throw new NodeError('ENOENT', 'access', target);
  }
}

export function unlinkSync(path: string | URL): void {
  const target = toPath(path);
  fileAt(target, 'unlink');
  volume.delete(target);
}

export function rmSync(path: string | URL, options: { recursive?: boolean; force?: boolean } = {}): void {
  const target = toPath(path);
  const entry = volume.get(target);
  if (!entry) {
    if (options.force) {
      return;
    }
    throw new NodeError('ENOENT', 'rm', target);
  }
  if (entry.kind === 'directory') {
    if (!options.recursive) {
      throw new NodeError('EISDIR', 'rm', target);
    }
    [...volume.keys()].filter((key) => key.startsWith(`${target}/`)).forEach((key) => volume.delete(key));
  }
  volume.delete(target);
}

export function rmdirSync(path: string | URL): void {
  const target = toPath(path);
  if (childrenOf(target).length > 0) {
    throw new NodeError('ENOTEMPTY', 'rmdir', target);
  }
  volume.delete(target);
}

export function renameSync(from: string | URL, to: string | URL): void {
  const source = toPath(from);
  const destination = toPath(to);
  const entry = volume.get(source);
  if (!entry) {
    throw new NodeError('ENOENT', 'rename', source);
  }
  parentOf(destination, 'rename');
  const moved = [...volume.entries()].filter(([key]) => key === source || key.startsWith(`${source}/`));
  moved.forEach(([key]) => volume.delete(key));
  moved.forEach(([key, value]) => volume.set(destination + key.slice(source.length), value));
}

export function copyFileSync(from: string | URL, to: string | URL, mode = 0): void {
  const source = toPath(from);
  const destination = toPath(to);
  if (mode & constants.COPYFILE_EXCL && volume.has(destination)) {
    throw new NodeError('EEXIST', 'copyfile', destination);
  }
  write(destination, Buffer.from(fileAt(source, 'copyfile').data), 'copyfile');
}

function later<T>(work: () => T): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    setTimeout(() => {
      try {
        resolvePromise(work());
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

export const promises = {
  constants,
  readFile: (path: string | URL, options?: EncodingOption) => later(() => readFileSync(path, options)),
  writeFile: (path: string | URL, data: Data, options?: EncodingOption) => later(() => writeFileSync(path, data, options)),
  appendFile: (path: string | URL, data: Data, options?: EncodingOption) => later(() => appendFileSync(path, data, options)),
  mkdir: (path: string | URL, options?: { recursive?: boolean }) => later(() => mkdirSync(path, options)),
  readdir: (path: string | URL, options?: { withFileTypes?: boolean; recursive?: boolean }) => later(() => readdirSync(path, options)),
  stat: (path: string | URL) => later(() => statSync(path) as Stats),
  lstat: (path: string | URL) => later(() => statSync(path) as Stats),
  access: (path: string | URL, _mode?: number) => later(() => accessSync(path)),
  unlink: (path: string | URL) => later(() => unlinkSync(path)),
  rm: (path: string | URL, options?: { recursive?: boolean; force?: boolean }) => later(() => rmSync(path, options)),
  rmdir: (path: string | URL) => later(() => rmdirSync(path)),
  rename: (from: string | URL, to: string | URL) => later(() => renameSync(from, to)),
  copyFile: (from: string | URL, to: string | URL, mode?: number) => later(() => copyFileSync(from, to, mode)),
};

function withCallback<T>(promise: Promise<T>, callback: Callback<T>): void {
  promise.then(
    (value) => callback(null, value),
    (error) => callback(error),
  );
}

function lastCallback(args: unknown[]): [unknown[], Callback<any>] {
  return [args.slice(0, -1), args[args.length - 1] as Callback<any>];
}

export function readFile(path: string | URL, ...rest: unknown[]): void {
  const [[options], callback] = lastCallback(rest);
  withCallback(promises.readFile(path, options as EncodingOption), callback);
}

export function writeFile(path: string | URL, data: Data, ...rest: unknown[]): void {
  const [[options], callback] = lastCallback(rest);
  withCallback(promises.writeFile(path, data, options as EncodingOption), callback);
}

export function appendFile(path: string | URL, data: Data, ...rest: unknown[]): void {
  const [[options], callback] = lastCallback(rest);
  withCallback(promises.appendFile(path, data, options as EncodingOption), callback);
}

export function mkdir(path: string | URL, ...rest: unknown[]): void {
  const [[options], callback] = lastCallback(rest);
  withCallback(promises.mkdir(path, options as { recursive?: boolean }), callback);
}

export function readdir(path: string | URL, ...rest: unknown[]): void {
  const [[options], callback] = lastCallback(rest);
  withCallback(promises.readdir(path, options as { withFileTypes?: boolean }), callback);
}

export function stat(path: string | URL, callback: Callback<Stats>): void {
  withCallback(promises.stat(path), callback);
}

export function unlink(path: string | URL, callback: Callback<void>): void {
  withCallback(promises.unlink(path), callback);
}

export function exists(path: string | URL, callback: (exists: boolean) => void): void {
  setTimeout(() => callback(existsSync(path)), 0);
}

export function createReadStream(path: string | URL, options: EncodingOption & { highWaterMark?: number; start?: number; end?: number } = {}) {
  const target = toPath(path);
  const settings = typeof options === 'string' ? { encoding: options } : (options ?? {});
  const chunkSize = settings.highWaterMark ?? 64 * 1024;
  let data: Buffer | undefined;
  let offset = settings.start ?? 0;
  const stream = new Readable({
    encoding: settings.encoding ?? undefined,
    highWaterMark: chunkSize,
    read() {
      try {
        data ??= fileAt(target, 'open').data;
      } catch (error) {
        this.destroy(error as Error);
        return;
      }
      const end = Math.min(data.length, settings.end === undefined ? data.length : settings.end + 1);
      if (offset >= end) {
        this.push(null);
        return;
      }
      const chunk = data.subarray(offset, Math.min(offset + chunkSize, end));
      offset += chunk.length;
      this.push(Buffer.from(chunk));
    },
  });
  return Object.assign(stream, { path: target });
}

export function createWriteStream(path: string | URL, options: EncodingOption & { flags?: string } = {}) {
  const target = toPath(path);
  const settings = typeof options === 'string' ? { encoding: options } : (options ?? {});
  let opened = false;
  const stream = new Writable({
    decodeStrings: true,
    write(chunk: Buffer, _encoding, callback) {
      try {
        if (!opened && settings.flags !== 'a') {
          writeFileSync(target, '');
        }
        opened = true;
        appendFileSync(target, chunk);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
    final(callback) {
      try {
        if (!opened && settings.flags !== 'a') {
          writeFileSync(target, '');
        }
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
  return Object.assign(stream, { path: target });
}
