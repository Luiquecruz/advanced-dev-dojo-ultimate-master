import BufferModule from 'buffer/index.js';
import EventEmitter from 'events/events.js';
import Stream from 'readable-stream';

const { Buffer } = BufferModule;
const { Readable, Writable } = Stream;

type Handler = (request: IncomingMessage, response: ServerResponse) => unknown;
type HeaderValue = string | number | string[];

export const STATUS_CODES: Record<number, string> = {
  100: 'Continue',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export const METHODS = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];

/**
 * Incoming request: a readable stream of the body plus method, url and lowercased headers.
 */
export class IncomingMessage extends Readable {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly rawHeaders: string[];
  readonly httpVersion = '1.1';
  readonly socket = { remoteAddress: '127.0.0.1', remotePort: 52000, encrypted: false };

  constructor(method: string, url: string, headers: Record<string, string>, body: Buffer | undefined) {
    super();
    this.method = method;
    this.url = url;
    this.headers = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
    this.rawHeaders = Object.entries(headers).flat();
    if (body && body.length > 0) {
      this.push(body);
    }
    this.push(null);
  }

  _read(): void {}
}

/**
 * Outgoing response: a writable stream that collects the body and the status and headers sent.
 */
export class ServerResponse extends Writable {
  statusCode = 200;
  statusMessage = '';
  headersSent = false;
  readonly chunks: Buffer[] = [];
  private readonly headerMap = new Map<string, { name: string; value: HeaderValue }>();

  constructor(readonly req: IncomingMessage) {
    super();
  }

  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
    this.headersSent = true;
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  _final(callback: (error?: Error | null) => void): void {
    this.headersSent = true;
    callback();
  }

  setHeader(name: string, value: HeaderValue): this {
    if (this.headersSent) {
      throw new Error('ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client');
    }
    this.headerMap.set(name.toLowerCase(), { name, value });
    return this;
  }

  appendHeader(name: string, value: HeaderValue): this {
    const existing = this.getHeader(name);
    const values = [existing ?? [], value].flat().map(String);
    return this.setHeader(name, values.length === 1 ? values[0] : values);
  }

  getHeader(name: string): HeaderValue | undefined {
    return this.headerMap.get(name.toLowerCase())?.value;
  }

  getHeaders(): Record<string, HeaderValue> {
    return Object.fromEntries([...this.headerMap.entries()].map(([key, { value }]) => [key, value]));
  }

  getHeaderNames(): string[] {
    return [...this.headerMap.keys()];
  }

  hasHeader(name: string): boolean {
    return this.headerMap.has(name.toLowerCase());
  }

  removeHeader(name: string): void {
    this.headerMap.delete(name.toLowerCase());
  }

  writeHead(statusCode: number, ...rest: Array<string | Record<string, HeaderValue> | undefined>): this {
    this.statusCode = statusCode;
    const message = rest.find((value): value is string => typeof value === 'string');
    const headers = rest.find((value): value is Record<string, HeaderValue> => typeof value === 'object' && value !== null);
    this.statusMessage = message ?? STATUS_CODES[statusCode] ?? '';
    Object.entries(headers ?? {}).forEach(([name, value]) => this.setHeader(name, value));
    this.headersSent = true;
    return this;
  }

  flushHeaders(): void {
    this.headersSent = true;
  }
}

let nextPort = 40000;
const servers = new Map<number, Server>();

/**
 * In-memory HTTP server: listen() registers a port that request() and fetch('http://localhost:<port>') reach.
 */
export class Server extends EventEmitter {
  listening = false;
  private port: number | undefined;
  private inFlight = 0;
  private closeCallbacks: Array<(error?: Error) => void> = [];

  constructor(handler?: Handler) {
    super();
    if (handler) {
      this.on('request', handler);
    }
  }

  listen(...args: unknown[]): this {
    const callback = args.find((value): value is () => void => typeof value === 'function');
    const options = args[0] !== null && typeof args[0] === 'object' ? (args[0] as { port?: number }) : undefined;
    const requested = Number(options?.port ?? (typeof args[0] === 'number' || typeof args[0] === 'string' ? args[0] : 0));
    const port = requested || nextPort++;
    if (servers.has(port)) {
      const error = Object.assign(new Error(`listen EADDRINUSE: address already in use :::${port}`), { code: 'EADDRINUSE', port });
      queueMicrotask(() => this.emit('error', error));
      return this;
    }
    servers.set(port, this);
    this.port = port;
    this.listening = true;
    if (callback) {
      this.once('listening', callback);
    }
    queueMicrotask(() => this.emit('listening'));
    return this;
  }

  address(): { port: number; address: string; family: string } | null {
    return this.port === undefined ? null : { port: this.port, address: '::', family: 'IPv6' };
  }

  close(callback?: (error?: Error) => void): this {
    if (!this.listening) {
      const error = Object.assign(new Error('Server is not running.'), { code: 'ERR_SERVER_NOT_RUNNING' });
      queueMicrotask(() => callback?.(error));
      return this;
    }
    servers.delete(this.port!);
    this.listening = false;
    if (callback) {
      this.closeCallbacks.push(callback);
    }
    this.finishClose();
    return this;
  }

  closeAllConnections(): void {}

  closeIdleConnections(): void {}

  get connections(): number {
    return this.inFlight;
  }

  private finishClose(): void {
    if (this.listening || this.inFlight > 0) {
      return;
    }
    const callbacks = this.closeCallbacks;
    this.closeCallbacks = [];
    queueMicrotask(() => {
      callbacks.forEach((callback) => callback());
      this.emit('close');
    });
  }

  /**
   * Runs one request through the request listeners and resolves when the response ends.
   */
  dispatch(request: IncomingMessage): Promise<ServerResponse> {
    const response = new ServerResponse(request);
    this.inFlight++;
    return new Promise<ServerResponse>((resolve, reject) => {
      const done = () => {
        this.inFlight--;
        this.finishClose();
      };
      response.on('finish', () => {
        done();
        resolve(response);
      });
      const fail = (error: unknown) => {
        done();
        reject(error);
      };
      try {
        if (this.listenerCount('request') === 0) {
          throw new Error('The server has no request listener. Pass a handler to createServer() or call server.on("request", handler).');
        }
        this.listeners('request').forEach((listener) => {
          const result = (listener as Handler)(request, response);
          if (result instanceof Promise) {
            result.catch(fail);
          }
        });
      } catch (error) {
        fail(error);
      }
    });
  }
}

export function createServer(handler?: Handler): Server;
export function createServer(options: object, handler?: Handler): Server;
export function createServer(first?: object | Handler, second?: Handler): Server {
  return new Server(typeof first === 'function' ? (first as Handler) : second);
}

export function serverOnPort(port: number): Server | undefined {
  return servers.get(port);
}

export function hasListeningServers(): boolean {
  return servers.size > 0;
}

export function closeAllServers(): void {
  [...servers.values()].forEach((server) => server.close());
  servers.clear();
}

export interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface TestResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
  body: any;
}

function serializeBody(init: RequestInit, headers: Record<string, string>): Buffer | undefined {
  if (init.body === undefined) {
    return undefined;
  }
  if (typeof init.body === 'string' || init.body instanceof Uint8Array) {
    return Buffer.from(init.body as string);
  }
  if (!Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
    headers['content-type'] = 'application/json';
  }
  return Buffer.from(JSON.stringify(init.body));
}

function parseBody(text: string, contentType: string | undefined): unknown {
  if (contentType?.includes('json') && text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Sends a request to a node:http server or handler and collects the response.
 */
export async function requestServer(target: Server | Handler, path: string, init: RequestInit = {}): Promise<TestResponse> {
  const server = target instanceof Server ? target : new Server(target);
  const headers = { host: 'localhost', ...init.headers };
  const body = serializeBody(init, headers);
  const response = await server.dispatch(new IncomingMessage((init.method ?? 'GET').toUpperCase(), path, headers, body));
  const text = Buffer.concat(response.chunks).toString('utf8');
  const responseHeaders = Object.fromEntries(Object.entries(response.getHeaders()).map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)]));
  return { status: response.statusCode, headers: responseHeaders, text, body: parseBody(text, responseHeaders['content-type']) };
}

/**
 * Request whose headers keep names browsers forbid on outgoing requests (Origin, Cookie, Host...), as a server receives them.
 */
class ServerRequest extends Request {
  readonly #headers: Headers;

  constructor(input: URL, init: globalThis.RequestInit & { headers: Record<string, string> }) {
    super(input, init);
    this.#headers = new Headers(init.headers);
  }

  get headers(): Headers {
    return this.#headers;
  }
}

/**
 * Sends a request to anything that answers Fetch API requests (a Hono app or a fetch handler).
 */
export async function requestFetchHandler(handler: (request: Request) => Response | Promise<Response>, path: string, init: RequestInit = {}): Promise<TestResponse> {
  const headers: Record<string, string> = { ...init.headers };
  const body = serializeBody(init, headers);
  const response = await handler(new ServerRequest(new URL(path, 'http://localhost'), { method: (init.method ?? 'GET').toUpperCase(), headers, body: body as BodyInit | undefined }));
  const text = await response.text();
  const responseHeaders = Object.fromEntries(response.headers.entries());
  return { status: response.status, headers: responseHeaders, text, body: parseBody(text, responseHeaders['content-type']) };
}

/**
 * Bridges a Fetch API request to a listening in-memory server.
 */
export async function fetchFromServer(server: Server, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : Buffer.from(await request.arrayBuffer());
  const response = await server.dispatch(new IncomingMessage(request.method, `${url.pathname}${url.search}`, headers, body));
  const responseHeaders = new Headers();
  Object.entries(response.getHeaders()).forEach(([name, value]) => [value].flat().forEach((item) => responseHeaders.append(name, String(item))));
  const status = response.statusCode;
  const nullBody = status === 204 || status === 304 || request.method === 'HEAD';
  return new Response(nullBody ? null : Buffer.concat(response.chunks), { status, statusText: response.statusMessage || STATUS_CODES[status], headers: responseHeaders });
}

export const Agent = class {};
export const globalAgent = new Agent();
