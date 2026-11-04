#!/usr/bin/env node
// Downloads the Pyodide packages the Python track uses (and their dependencies) once from the official Pyodide CDN at the pinned
// version, verifies each wheel against the sha256 in node_modules/pyodide/pyodide-lock.json, and stores them with their license
// files, Pyodide's own MPL-2.0 license and the CPython (PSF) license of python_stdlib.zip, which the npm package does not ship,
// in vendor/pyodide-packages/. License hashes are pinned in manifest.json on first download. The app and `npm run verify` load only these files; nothing is fetched at runtime.
// Usage: npm run python:vendor            (download missing wheels, verify all)
//        npm run python:vendor -- --check (verify only, never download; exits 1 on a missing or altered wheel)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VENDOR = join(ROOT, 'vendor/pyodide-packages');
const LICENSES = join(VENDOR, 'licenses');
const ROOT_PACKAGES = ['pydantic'];
const require = createRequire(join(ROOT, 'package.json'));
const pyodideDirectory = dirname(require.resolve('pyodide/package.json'));
const { version } = JSON.parse(readFileSync(join(pyodideDirectory, 'package.json'), 'utf8'));
const CDN = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
const PYODIDE_LICENSE = `https://raw.githubusercontent.com/pyodide/pyodide/${version}/LICENSE`;
const LICENSE_FILE = /\.dist-info\/(?:licenses\/)?(?:LICEN[CS]E|COPYING|NOTICE)[^/]*$/i;

function fail(message) {
  console.error(`vendor-packages: ${message}`);
  process.exit(1);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The lock entries of the root packages and everything they depend on, in a stable order.
 */
function closure(lock) {
  const names = new Set();
  const visit = (name) => {
    const key = name.toLowerCase().replace(/_/g, '-');
    const entry = lock.packages[key];
    if (!entry) {
      fail(`"${name}" is not in pyodide-lock.json for pyodide ${version}`);
    }
    if (names.has(key)) {
      return;
    }
    names.add(key);
    entry.depends.forEach(visit);
  };
  ROOT_PACKAGES.forEach(visit);
  return [...names].sort().map((name) => ({ ...lock.packages[name], name }));
}

/**
 * Reads the files of a zip archive (wheels are zips) without a dependency: central directory, then stored or deflated entries.
 */
function unzip(bytes) {
  const buffer = Buffer.from(bytes);
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) {
    end -= 1;
  }
  if (end < 0) {
    fail('not a zip archive');
  }
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    files.set(name, () => (method === 0 ? data : inflateRawSync(data)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

async function download(entry) {
  const response = await fetch(`${CDN}${entry.file_name}`);
  if (!response.ok) {
    fail(`${entry.file_name}: HTTP ${response.status} from ${CDN}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

const check = process.argv.includes('--check');
const lock = JSON.parse(readFileSync(join(pyodideDirectory, 'pyodide-lock.json'), 'utf8'));
const entries = closure(lock);
if (!check) {
  rmSync(LICENSES, { recursive: true, force: true });
}
mkdirSync(LICENSES, { recursive: true });
const manifest = [];
for (const entry of entries) {
  const path = join(VENDOR, entry.file_name);
  let bytes = existsSync(path) ? readFileSync(path) : undefined;
  if (!bytes) {
    if (check) {
      fail(`${entry.file_name} is missing; run npm run python:vendor`);
    }
    bytes = await download(entry);
  }
  const digest = sha256(bytes);
  if (digest !== entry.sha256) {
    fail(`${entry.file_name}: sha256 ${digest} does not match the lock (${entry.sha256})`);
  }
  if (!check) {
    writeFileSync(path, bytes);
    for (const [name, read] of unzip(bytes)) {
      if (LICENSE_FILE.test(name)) {
        writeFileSync(join(LICENSES, `${entry.name}-${name.split('/').pop()}`), read());
      }
    }
  }
  manifest.push({ name: entry.name, version: entry.version, file: entry.file_name, sha256: entry.sha256, bytes: bytes.length });
}
const runtimeLicenses = [
  { file: 'pyodide-LICENSE', url: PYODIDE_LICENSE },
  { file: 'cpython-LICENSE', url: `https://raw.githubusercontent.com/python/cpython/v${lock.info.python}/LICENSE` },
];
const manifestPath = join(VENDOR, 'manifest.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const pinned = new Map((previous.licenses ?? []).map((license) => [license.file, license.sha256]));
if (!check) {
  for (const { file, url } of runtimeLicenses) {
    const response = await fetch(url);
    if (!response.ok) {
      fail(`${url}: HTTP ${response.status}`);
    }
    const text = await response.text();
    if (pinned.has(file) && pinned.get(file) !== sha256(text)) {
      fail(`${file} from ${url} changed since it was pinned in manifest.json; review it and delete its entry to re-pin`);
    }
    writeFileSync(join(LICENSES, file), text);
  }
}
const licenses = readdirSync(LICENSES).sort().map((file) => ({ file, sha256: sha256(readFileSync(join(LICENSES, file))) }));
if (check) {
  for (const { file } of runtimeLicenses) {
    if (!licenses.some((license) => license.file === file)) {
      fail(`licenses/${file} is missing; run npm run python:vendor`);
    }
  }
  for (const license of licenses) {
    if (pinned.get(license.file) !== license.sha256) {
      fail(`licenses/${license.file} does not match the sha256 pinned in manifest.json`);
    }
  }
}
const expected = new Set(entries.map((entry) => entry.file_name));
for (const file of readdirSync(VENDOR)) {
  if (file.endsWith('.whl') && !expected.has(file)) {
    if (check) {
      fail(`${file} is not part of the pinned closure`);
    }
    rmSync(join(VENDOR, file));
  }
}
if (!check) {
  writeFileSync(manifestPath, `${JSON.stringify({ pyodide: version, source: CDN, packages: manifest, licenses }, null, 2)}\n`);
}
const total = manifest.reduce((sum, item) => sum + item.bytes, 0);
console.log(`${check ? 'verified' : 'vendored'} ${manifest.length} wheels for pyodide ${version}, ${(total / 1024).toFixed(0)} KiB`);
for (const item of manifest) {
  console.log(`  ${item.file}  ${item.sha256}  ${(item.bytes / 1024).toFixed(0)} KiB`);
}
