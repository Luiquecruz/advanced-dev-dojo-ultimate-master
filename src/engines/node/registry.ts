import BufferModule from 'buffer/index.js';
import Stream from 'readable-stream';
import * as Hono from 'hono';
import * as HonoHttpException from 'hono/http-exception';
import * as HonoValidator from 'hono/validator';
import * as HonoCors from 'hono/cors';
import * as HonoLogger from 'hono/logger';
import * as HonoRequestId from 'hono/request-id';
import * as HonoSecureHeaders from 'hono/secure-headers';
import * as HonoBearerAuth from 'hono/bearer-auth';
import * as HonoBasicAuth from 'hono/basic-auth';
import * as HonoJwt from 'hono/jwt';
import * as HonoFactory from 'hono/factory';
import * as HonoStreaming from 'hono/streaming';
import * as HonoClient from 'hono/client';
import * as HonoTiming from 'hono/timing';
import * as HonoBodyLimit from 'hono/body-limit';
import * as HonoEtag from 'hono/etag';
import * as HonoCookie from 'hono/cookie';
import * as HonoTesting from 'hono/testing';
import * as HonoTimeout from 'hono/timeout';
import * as HonoZodValidator from '@hono/zod-validator';
import * as Zod from 'zod';
import assert from './runtime/assert';
import * as Crypto from './runtime/crypto';
import { events } from './runtime/events';
import * as Fs from './runtime/fs';
import * as Http from './runtime/http';
import * as Path from './runtime/path';
import { process } from './runtime/process';
import { os, querystring, url } from './runtime/system';
import * as Timers from './runtime/timers';
import * as Util from './runtime/util';
import { nodeAi } from './ai';
import { esModule, type ModuleRegistry } from '../shared/project';

const StreamExtras = Stream as typeof Stream & { compose: unknown; addAbortSignal: unknown; promises: { pipeline: unknown; finished: unknown } };
const stream = {
  default: Stream.Stream,
  Stream: Stream.Stream,
  Readable: Stream.Readable,
  Writable: Stream.Writable,
  Duplex: Stream.Duplex,
  Transform: Stream.Transform,
  PassThrough: Stream.PassThrough,
  pipeline: Stream.pipeline,
  finished: Stream.finished,
  compose: StreamExtras.compose,
  addAbortSignal: StreamExtras.addAbortSignal,
  promises: StreamExtras.promises,
};
const timers = { setTimeout: Timers.setTimeout, setInterval: Timers.setInterval, setImmediate: Timers.setImmediate, clearTimeout: Timers.clearTimeout, clearInterval: Timers.clearInterval, clearImmediate: Timers.clearImmediate };

const NODE_MODULES: Record<string, unknown> = {
  events,
  buffer: BufferModule,
  stream,
  'stream/promises': stream.promises,
  fs: Fs,
  'fs/promises': Fs.promises,
  path: Path.default,
  'path/posix': Path.default,
  http: Http,
  crypto: Crypto,
  util: Util,
  'util/types': Util.types,
  assert,
  'assert/strict': assert,
  process,
  timers,
  'timers/promises': Timers.promises,
  os,
  url,
  querystring,
};

function moduleOf(value: object): Record<string, unknown> {
  const named: Record<string, unknown> = {};
  for (let current: object | null = value; current && current !== Object.prototype && current !== Function.prototype; current = Object.getPrototypeOf(current)) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name === 'constructor' || name in named) {
        continue;
      }
      if (current === value) {
        named[name] = (value as Record<string, unknown>)[name];
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(current, name)!;
      if (typeof descriptor.value === 'function') {
        named[name] = descriptor.value.bind(value);
      }
    }
  }
  return esModule({ ...named, default: (value as { default?: unknown }).default ?? value });
}

const nodeEntries = Object.entries(NODE_MODULES).flatMap(([name, value]) => {
  const module = moduleOf(value as object);
  return [
    [name, module],
    [`node:${name}`, module],
  ];
});

export const nodeRegistry: ModuleRegistry = {
  ...Object.fromEntries(nodeEntries),
  hono: esModule(Hono),
  'hono/http-exception': esModule(HonoHttpException),
  'hono/validator': esModule(HonoValidator),
  'hono/cors': esModule(HonoCors),
  'hono/logger': esModule(HonoLogger),
  'hono/request-id': esModule(HonoRequestId),
  'hono/secure-headers': esModule(HonoSecureHeaders),
  'hono/bearer-auth': esModule(HonoBearerAuth),
  'hono/basic-auth': esModule(HonoBasicAuth),
  'hono/jwt': esModule(HonoJwt),
  'hono/factory': esModule(HonoFactory),
  'hono/streaming': esModule(HonoStreaming),
  'hono/client': esModule(HonoClient),
  'hono/timing': esModule(HonoTiming),
  'hono/body-limit': esModule(HonoBodyLimit),
  'hono/etag': esModule(HonoEtag),
  'hono/cookie': esModule(HonoCookie),
  'hono/testing': esModule(HonoTesting),
  'hono/timeout': esModule(HonoTimeout),
  '@hono/zod-validator': esModule(HonoZodValidator),
  zod: esModule(Zod),
  '@dojo/ai': esModule(nodeAi.module),
  '@dojo/ai/testing': esModule(nodeAi.testing),
};
