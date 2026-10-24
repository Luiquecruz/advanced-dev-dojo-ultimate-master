export const LIB_FILE_NAME = 'lib.esnext.d.ts';

export const GLOBALS_FILE_NAME = 'globals.d.ts';

export const TEST_HELPERS_FILE_NAME = 'test-helpers.d.ts';

export const GLOBALS_DECLARATION = `interface Console {
  log(...data: any[]): void;
  info(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
  table(data: unknown): void;
}
declare var console: Console;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(id: number | undefined): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(id: number | undefined): void;
declare function queueMicrotask(callback: () => void): void;
declare function structuredClone<T>(value: T): T;
`;

export const TEST_HELPERS_DECLARATION = `type Expect<T extends true> = T;
type ExpectFalse<T extends false> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;
type IsAny<T> = 0 extends 1 & T ? true : false;
type Extends<A, B> = [A] extends [B] ? true : false;
declare function expectType<T>(value: T): void;
`;
