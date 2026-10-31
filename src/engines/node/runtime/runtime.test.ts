import { beforeEach, describe, expect, it } from 'vitest';
import { createHash, createHmac, pbkdf2Sync, timingSafeEqual } from './crypto';
import * as fs from './fs';
import { createServer, requestFetchHandler, requestServer } from './http';
import { installNodeFetch, resetNodeRuntime } from './index';
import * as path from './path';
import { process } from './process';
import { format, inspect, parseArgs, promisify } from './util';
import { nodeAdapter, compileNodeFile, runNodeProgram } from '../adapter';
import { runTests } from '../../shared/testRunner';

beforeEach(() => resetNodeRuntime());

describe('node:path', () => {
  it('joins, resolves and parses posix paths', () => {
    expect(path.join('/a/b', '../c', './d.txt')).toBe('/a/c/d.txt');
    expect(path.join('a', '', 'b/')).toBe('a/b/');
    expect(path.resolve('data', 'users.json')).toBe('/app/data/users.json');
    expect(path.resolve('/x', '/y', 'z')).toBe('/y/z');
    expect(path.relative('/app/src', '/app/data/a.json')).toBe('../data/a.json');
    expect(path.parse('/home/user/file.test.ts')).toEqual({ root: '/', dir: '/home/user', base: 'file.test.ts', ext: '.ts', name: 'file.test' });
    expect(path.extname('.env')).toBe('');
    expect(path.basename('/a/b.js', '.js')).toBe('b');
  });
});

describe('node:fs', () => {
  it('reads and writes files with Node errors', async () => {
    fs.mkdirSync('data/nested', { recursive: true });
    fs.writeFileSync('data/nested/a.txt', 'hello');
    expect(fs.readFileSync('/app/data/nested/a.txt', 'utf8')).toBe('hello');
    expect(fs.readdirSync('data')).toEqual(['nested']);
    await fs.promises.appendFile('data/nested/a.txt', ' world');
    expect(await fs.promises.readFile('data/nested/a.txt', 'utf8')).toBe('hello world');
    await expect(fs.promises.readFile('missing.txt')).rejects.toMatchObject({ code: 'ENOENT', message: "ENOENT: no such file or directory, open '/app/missing.txt'" });
    expect(() => fs.writeFileSync('nope/a.txt', 'x')).toThrow(/ENOENT/);
  });

  it('streams files in chunks', async () => {
    fs.writeFileSync('big.txt', 'abcdefghij');
    const chunks: string[] = [];
    for await (const chunk of fs.createReadStream('big.txt', { encoding: 'utf8', highWaterMark: 4 })) {
      chunks.push(chunk as string);
    }
    expect(chunks).toEqual(['abcd', 'efgh', 'ij']);
  });
});

describe('node:crypto', () => {
  it('hashes with sha256, sha1 and hmac', () => {
    expect(createHash('sha256').update('abc').digest('hex')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(createHash('sha1').update('abc').digest('hex')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(createHmac('sha256', 'key').update('The quick brown fox jumps over the lazy dog').digest('hex')).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
    expect(pbkdf2Sync('password', 'salt', 1, 32, 'sha256').toString('hex')).toBe('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
  });
});

describe('node:util', () => {
  it('formats and inspects like Node', () => {
    expect(format('%s has %d items', 'cart', 3, { a: 1 })).toBe("cart has 3 items { a: 1 }");
    expect(inspect({ user: { name: 'Ada', tags: ['a'] }, map: new Map([['k', 1]]) })).toBe("{ user: { name: 'Ada', tags: [ 'a' ] }, map: Map(1) { 'k' => 1 } }");
  });

  it('parses arguments and promisifies callbacks', async () => {
    const parsed = parseArgs({ args: ['--port', '8080', '-v', 'serve'], options: { port: { type: 'string' }, verbose: { type: 'boolean', short: 'v' } }, allowPositionals: true });
    expect(parsed).toEqual({ values: { port: '8080', verbose: true }, positionals: ['serve'] });
    const double = promisify((value: number, callback: (error: Error | null, result?: number) => void) => callback(null, value * 2));
    expect(await double(21)).toBe(42);
  });
});

describe('node:http', () => {
  it('serves requests through request() and fetch()', async () => {
    const server = createServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
      }
      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ method: request.method, url: request.url, body: JSON.parse(body || 'null') }));
    });
    const result = await requestServer(server, '/items?x=1', { method: 'post', body: { name: 'pen' } });
    expect(result).toMatchObject({ status: 201, body: { method: 'POST', url: '/items?x=1', body: { name: 'pen' } } });

    installNodeFetch(globalThis);
    server.listen(3000);
    const response = await fetch('http://localhost:3000/ping');
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ url: '/ping' });
    await expect(fetch('http://localhost:3999/')).rejects.toThrow('fetch failed');
    server.close();
  });

  it('answers Fetch API handlers', async () => {
    const result = await requestFetchHandler(async (request) => Response.json({ path: new URL(request.url).pathname }), '/health');
    expect(result.body).toEqual({ path: '/health' });
  });
});

describe('node adapter', () => {
  it('binds Node globals in learner modules and resets state between tests', async () => {
    const files = {
      'main.ts': "import { readFile } from 'node:fs/promises';\nexport const port = Number(process.env.PORT ?? 3000);\nexport const load = () => readFile('config.json', 'utf8');\nexport const encoded = Buffer.from('hi').toString('base64');",
    };
    const tests = [
      "test('reads env', () => { expect(mod.port).toBe(3000); process.env.PORT = '1'; });",
      "test('env was reset', async () => { expect(process.env.PORT).toBeUndefined(); writeFiles({ 'config.json': '{}' }); expect(await mod.load()).toBe('{}'); expect(mod.encoded).toBe('aGk='); });",
    ].join('\n');
    const report = await runTests(nodeAdapter, { files, entry: 'main.ts', tests });
    expect(report.results).toEqual([
      { name: 'reads env', passed: true },
      { name: 'env was reset', passed: true },
    ]);
    expect(compileNodeFile('main.ts', 'export const a = 1;')).toMatch(/^"use strict";var process = require\("node:process"\);/);
    expect(process.cwd()).toBe('/app');
  });

  it('runs Hono apps with Zod validation through request()', async () => {
    const files = {
      'main.ts': [
        "import { Hono } from 'hono';",
        "import { zValidator } from '@hono/zod-validator';",
        "import { z } from 'zod';",
        "export const app = new Hono();",
        "app.get('/users/:id', (c) => c.json({ id: Number(c.req.param('id')) }));",
        "app.post('/users', zValidator('json', z.object({ name: z.string().min(1) })), (c) => c.json(c.req.valid('json'), 201));",
      ].join('\n'),
    };
    const tests = [
      "test('reads params', async () => { expect((await request(mod.app, '/users/7')).body).toEqual({ id: 7 }); });",
      "test('validates bodies', async () => { expect((await request(mod.app, '/users', { method: 'POST', body: { name: '' } })).status).toBe(400); expect((await request(mod.app, '/users', { method: 'POST', body: { name: 'Ada' } })).status).toBe(201); });",
    ].join('\n');
    const report = await runTests(nodeAdapter, { files, entry: 'main.ts', tests });
    expect(report.results.filter((result) => !result.passed)).toEqual([]);
  });
});

describe('@dojo/ai in node challenges', () => {
  it('lets learner code call the fake model while tests script it, and resets between tests', async () => {
    const files = {
      'main.ts': `import { createModel } from '@dojo/ai';
const model = createModel();
export async function answer(question: string) {
  const response = await model.generate({ messages: [{ role: 'user', content: question }] });
  return response.text;
}`,
    };
    const tests = `test('uses the scripted reply', async () => {
  fakeModel.reply(respond.text('Paris'));
  expect(await mod.answer('Capital of France?')).toBe('Paris');
  expect(fakeModel.requests[0].messages[0].content).toBe('Capital of France?');
});
test('starts clean', async () => {
  expect(fakeModel.requests.length).toBe(0);
  expect(await mod.answer('x')).toContain('No scripted reply');
});`;
    const report = await runTests(nodeAdapter, { files, entry: 'main.ts', tests });
    expect(report.results).toEqual([{ name: 'uses the scripted reply', passed: true }, { name: 'starts clean', passed: true }]);
  });
});

describe('@dojo/ai in the Run button', () => {
  it('keeps the program alive while a scripted reply is delayed', async () => {
    const files = {
      'main.ts': `import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
fakeModel.reply(respond.slow(60, respond.text('Delayed answer')));
async function main() {
  const response = await createModel().generate({ messages: [{ role: 'user', content: 'Hi' }] });
  console.log(response.text, response.usage.totalTokens);
}
main();`,
    };
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => void lines.push(args.map(String).join(' '));
    try {
      await runNodeProgram(files, 'main.ts');
    } finally {
      console.log = original;
    }
    expect(lines).toContain('Delayed answer 9');
  });
});
