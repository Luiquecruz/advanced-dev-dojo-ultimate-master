#!/usr/bin/env node
// Builds the C# engine's served files in vendor/dotnet/ from official artifacts only, without the .NET SDK, MSBuild or a workload:
// - downloads the NuGet packages of the .NET WebAssembly runtime (browser-wasm runtime pack), the reference pack, the WebAssembly
//   SDK pack (its Webcil converter) and Roslyn from nuget.org and checks each against the SHA-512 `packageHash` of its NuGet catalog entry;
// - downloads the .NET runtime (not the SDK) for this machine from builds.dotnet.microsoft.com and checks it against the
//   SHA-512 in releases.json; it only runs csc.dll and the Webcil converter here, at install time, and is never served;
// - compiles the C# host (src/engines/csharp/host/*.cs) with csc.dll into Dojo.Testing.dll and DojoHost.dll, deterministically;
// - converts every booted assembly (CoreLib, the BCL assemblies the lessons need, Roslyn, the host) to Webcil wrapped in a
//   WebAssembly module (`.wasm`, what the .NET 10 SDK publishes) with WebcilConvert.cs, and wraps the reference assemblies of the
//   learner compilation (Roslyn reads them as PE files) in a one-section WebAssembly module (`ref/*.wasm`, wrapReference), so no .dll
//   is served and the host compresses every file as application/wasm or JavaScript;
// - copies that set (plus licenses) to vendor/dotnet/ and measures it with Brotli quality 5, close to what a CDN sends
//   (pyodide.asm.wasm: 3,227,042 B at q5, 3,285,125 B as served by the previous host), against BROTLI_BUDGET; quality 11 is
//   printed for reference.
// Only manifest.json is committed: it pins the package and runtime hashes and the SHA-256 of every served file. Downloads and the
// toolchain stay in vendor/dotnet/.cache/ (git-ignored, like node_modules). When every served file matches the manifest and the
// sources did not change, the script uses no network and compiles nothing. In CI (CI set) it never rewrites the manifest: a manifest that does not match the script
// or the sources fails the install, a rebuild of missing files must reproduce the committed manifest exactly, and the toolchain is
// extracted again from its checked archive, since a cache is not trusted.
// Usage: npm run csharp:vendor            (download what is missing or altered, rebuild, verify all)
//        npm run csharp:vendor -- --check (verify only, never download or compile; exits 1 on a missing, altered or stale file)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gunzipSync, inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VENDOR = join(ROOT, 'vendor/dotnet');
const CACHE = join(VENDOR, '.cache');
const HOST_SOURCES = join(ROOT, 'src/engines/csharp/host');
const CONVERTER_SOURCE = join(ROOT, 'scripts/csharp-track/WebcilConvert.cs');
const MANIFEST = join(VENDOR, 'manifest.json');

const DOTNET = '10.0.14';
const ROSLYN = '5.9.0';
// Brotli quality 5 is the closest to what a CDN sends; the served set must stay under the budget at that quality.
const BROTLI_QUALITY = 5;
const BROTLI_BUDGET = 8.5 * 1024 * 1024;
const FETCH_ATTEMPTS = 4;
const NUGET = 'https://api.nuget.org/v3-flatcontainer';
const REGISTRATION = 'https://api.nuget.org/v3/registration5-gz-semver2';
const RELEASES = `https://builds.dotnet.microsoft.com/dotnet/release-metadata/${DOTNET.split('.').slice(0, 2).join('.')}/releases.json`;
const PACKAGES = {
  runtime: { id: 'Microsoft.NETCore.App.Runtime.Mono.browser-wasm', version: DOTNET },
  ref: { id: 'Microsoft.NETCore.App.Ref', version: DOTNET },
  common: { id: 'Microsoft.CodeAnalysis.Common', version: ROSLYN },
  csharp: { id: 'Microsoft.CodeAnalysis.CSharp', version: ROSLYN },
  toolset: { id: 'Microsoft.Net.Compilers.Toolset', version: ROSLYN },
  webassembly: { id: 'Microsoft.NET.Sdk.WebAssembly.Pack', version: DOTNET },
};
const TOOLCHAIN_RIDS = ['linux-x64', 'linux-arm64', 'linux-musl-x64', 'linux-musl-arm64', 'osx-x64', 'osx-arm64', 'win-x64', 'win-arm64'];

// Runtime files from runtimes/browser-wasm/native/ of the runtime pack, served at the root of dotnet/; CoreLib is served there too, as Webcil.
const RUNTIME_FILES = ['dotnet.js', 'dotnet.runtime.js', 'dotnet.native.js', 'dotnet.native.wasm'];
const CORE_LIBRARY = 'System.Private.CoreLib.dll';
// Implementation assemblies loaded by the runtime (assemblies/): what Roslyn and the host load for a compile and a run, plus what the
// referenced APIs load (System.Text.Json pulls System.IO.Pipelines and Reflection.Emit), measured with AppDomain.GetAssemblies() after
// a run that booted with the whole runtime pack. A lesson that needs another one adds it here and to REFERENCES.
const ASSEMBLIES = [
  'Microsoft.CodeAnalysis.dll',
  'Microsoft.CodeAnalysis.CSharp.dll',
  'System.Collections.dll',
  'System.Collections.Concurrent.dll',
  'System.Collections.Immutable.dll',
  'System.Console.dll',
  'System.IO.MemoryMappedFiles.dll',
  'System.IO.Pipelines.dll',
  'System.Linq.dll',
  'System.Memory.dll',
  'System.Numerics.Vectors.dll',
  'System.ObjectModel.dll',
  'System.Private.Uri.dll',
  'System.Private.Xml.dll',
  'System.Private.Xml.Linq.dll',
  'System.Reflection.Emit.ILGeneration.dll',
  'System.Reflection.Emit.Lightweight.dll',
  'System.Reflection.Metadata.dll',
  'System.Reflection.Primitives.dll',
  'System.Runtime.dll',
  'System.Runtime.InteropServices.dll',
  'System.Runtime.InteropServices.JavaScript.dll',
  'System.Runtime.Loader.dll',
  'System.Runtime.Numerics.dll',
  'System.Security.Cryptography.dll',
  'System.Text.Encoding.Extensions.dll',
  'System.Text.Encodings.Web.dll',
  'System.Text.Json.dll',
  'System.Text.RegularExpressions.dll',
  'System.Threading.dll',
  'System.Threading.Tasks.dll',
  'System.Threading.Tasks.Parallel.dll',
  'System.Xml.XDocument.dll',
];
// Reference assemblies of the learner compilation (ref/, mounted at /ref in the runtime's file system). Learner code can only name
// types from these and Dojo.Testing; System.Runtime.InteropServices.JavaScript is left out on purpose (JSHost reaches worker globals).
const REFERENCES = [
  'System.Runtime.dll',
  'System.Collections.dll',
  'System.Collections.Concurrent.dll',
  'System.Collections.Immutable.dll',
  'System.Console.dll',
  'System.Linq.dll',
  'System.Memory.dll',
  'System.ObjectModel.dll',
  'System.Runtime.Numerics.dll',
  'System.Text.Json.dll',
  'System.Text.RegularExpressions.dll',
  'System.Threading.dll',
  'System.Threading.Tasks.dll',
];
// Host sources compiled into Dojo.Testing.dll (the API tests use); every other .cs file in the folder builds DojoHost.dll.
const TESTING_SOURCES = ['Testing.cs'];
const ANALYZERS = ['Microsoft.Interop.JavaScript.JSImportGenerator.dll', 'Microsoft.Interop.SourceGeneration.dll'];
const WEBCIL_LIBRARY = 'Microsoft.NET.WebAssembly.Webcil.dll';
// Name of the custom section that carries a reference assembly's PE bytes in ref/*.wasm (src/engines/csharp/engine.ts unwraps it).
const REFERENCE_SECTION = 'dojo.pe';

const check = process.argv.includes('--check');
const ci = Boolean(process.env.CI);

function fail(message) {
  console.error(`vendor-dotnet: ${message}`);
  process.exit(1);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha512(bytes) {
  return createHash('sha512').update(bytes).digest('hex');
}

function brotliSize(bytes, quality) {
  return brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: quality, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length } }).length;
}

function leb128(value) {
  const bytes = [];
  let rest = value;
  do {
    const byte = rest & 0x7f;
    rest = Math.floor(rest / 128);
    bytes.push(rest > 0 ? byte | 0x80 : byte);
  } while (rest > 0);
  return Buffer.from(bytes);
}

/**
 * A reference assembly as a valid WebAssembly module with one custom section (REFERENCE_SECTION) holding its PE bytes, so it is
 * served and compressed as application/wasm; `unwrapReference` in src/engines/csharp/engine.ts takes the bytes out for Roslyn.
 */
function wrapReference(bytes) {
  const name = Buffer.from(REFERENCE_SECTION);
  const content = Buffer.concat([leb128(name.length), name, bytes]);
  return Buffer.concat([Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00]), leb128(content.length), content]);
}

function wasmName(file) {
  return file.replace(/\.dll$/, '.wasm');
}

/**
 * Short hash of the served set (paths and SHA-256s): the version folder the files are served under (dotnet/<version>/) and the
 * `dojo-dotnet` meta of index.html. plugins/dotnetPlugin.ts recomputes it and refuses a manifest whose version does not match.
 */
function setVersion(files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    hash.update(file.path).update('\0').update(file.sha256).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function mebibytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

/**
 * The served files expected for the current configuration: published path → role. The worker loads each role differently.
 */
function servedLayout() {
  const layout = new Map();
  for (const file of RUNTIME_FILES) layout.set(file, 'runtime');
  layout.set(wasmName(CORE_LIBRARY), 'core');
  for (const file of ASSEMBLIES) layout.set(`assemblies/${wasmName(file)}`, 'assembly');
  layout.set('assemblies/Dojo.Testing.wasm', 'assembly');
  layout.set('assemblies/DojoHost.wasm', 'host');
  for (const file of REFERENCES) layout.set(`ref/${wasmName(file)}`, 'reference');
  layout.set('ref/Dojo.Testing.wasm', 'reference');
  for (const file of ['dotnet-LICENSE.TXT', 'dotnet-THIRD-PARTY-NOTICES.TXT', 'roslyn-ThirdPartyNotices.rtf']) layout.set(`licenses/${file}`, 'license');
  return layout;
}

/**
 * SHA-256 of the host sources by file name, so a changed or added .cs file makes the served host stale.
 */
function hostSources() {
  return Object.fromEntries(
    readdirSync(HOST_SOURCES)
      .filter((file) => file.endsWith('.cs'))
      .sort()
      .map((file) => [file, sha256(readFileSync(join(HOST_SOURCES, file)))]),
  );
}

/**
 * What the served bytes are built with besides the packages and the host: the converter source and the reference wrapper format.
 */
function buildInputs() {
  return { converter: sha256(readFileSync(CONVERTER_SOURCE)), referenceSection: REFERENCE_SECTION };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Why the committed manifest does not describe the current configuration (versions, host sources, curated set), or undefined.
 * Only a rebuild with a new manifest fixes it, so CI fails on it.
 */
function configReason(manifest) {
  if (!manifest.files) return 'vendor/dotnet/manifest.json has no files';
  if (manifest.dotnet !== DOTNET || manifest.roslyn !== ROSLYN) return `manifest pins .NET ${manifest.dotnet} / Roslyn ${manifest.roslyn}, the script ${DOTNET} / ${ROSLYN}`;
  if (!sameJson(manifest.host?.sources, hostSources())) return 'the host sources in src/engines/csharp/host changed since the host was compiled';
  if (!sameJson(manifest.build, buildInputs())) return 'scripts/csharp-track/WebcilConvert.cs or the reference wrapper changed since the files were built';
  if (manifest.version !== setVersion(manifest.files)) return 'the manifest version does not match its files';
  const layout = servedLayout();
  const listed = new Map(manifest.files.map((file) => [file.path, file]));
  for (const [path, role] of layout) {
    if (listed.get(path)?.role !== role) return `${path} is not in the manifest (the curated set changed)`;
  }
  for (const file of manifest.files) {
    if (!layout.has(file.path)) return `${file.path} is in the manifest but no longer part of the curated set`;
  }
  return undefined;
}

/**
 * Why the served set does not match the manifest and the current configuration, or undefined when it does.
 */
function staleReason(manifest) {
  const reason = configReason(manifest);
  if (reason) return reason;
  const layout = servedLayout();
  for (const file of manifest.files) {
    const path = join(VENDOR, file.path);
    if (!existsSync(path)) return `${file.path} is missing`;
    if (sha256(readFileSync(path)) !== file.sha256) return `${file.path} does not match the sha256 in manifest.json`;
  }
  const extra = servedFiles().filter((path) => !layout.has(path));
  if (extra.length > 0) return `${extra[0]} is not part of the curated set`;
  return undefined;
}

/**
 * Every file under vendor/dotnet/ except the manifest and the cache, as published paths.
 */
function servedFiles() {
  if (!existsSync(VENDOR)) return [];
  return readdirSync(VENDOR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(VENDOR, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((path) => path !== 'manifest.json' && !path.startsWith('.cache/'));
}

/**
 * Reads a zip archive (nupkg files are zips) without a dependency: central directory, then stored or deflated entries.
 */
function unzip(bytes) {
  const buffer = Buffer.from(bytes);
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) fail('not a zip archive');
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
    files.set(decodeURIComponent(name), () => (method === 0 ? Buffer.from(data) : inflateRawSync(data)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/**
 * Extracts a .tar.gz archive into a directory: regular files (with their mode) and directories, ustar, GNU long names and pax
 * paths. Entries that would land outside the directory are refused. Symbolic and hard links are skipped: the .NET runtime archive
 * has none, and a link extracted first could redirect a later write outside the directory.
 */
function untarGz(bytes, destination) {
  const data = gunzipSync(bytes);
  let offset = 0;
  let longName;
  let paxPath;
  const text = (start, length) => data.toString('utf8', start, start + length).replace(/\0.*$/s, '');
  while (offset + 512 <= data.length) {
    const header = offset;
    if (data.subarray(header, header + 512).every((byte) => byte === 0)) break;
    const size = Number.parseInt(text(header + 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(data[header + 156] || 48);
    const prefix = text(header + 345, 155);
    let name = longName ?? paxPath ?? (prefix ? `${prefix}/${text(header, 100)}` : text(header, 100));
    const body = data.subarray(header + 512, header + 512 + size);
    offset = header + 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') {
      longName = body.toString('utf8').replace(/\0.*$/s, '');
      continue;
    }
    if (type === 'x') {
      paxPath = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))?.[1];
      continue;
    }
    longName = undefined;
    paxPath = undefined;
    name = name.replace(/^\.\//, '');
    if (!name || type === 'g') continue;
    const target = resolve(destination, name);
    if (target !== destination && !target.startsWith(`${destination}${sep}`)) fail(`tar entry ${name} escapes the extraction directory`);
    if (type === '5') {
      mkdirSync(target, { recursive: true });
    } else if (type === '0' || type === '7') {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
      chmodSync(target, (Number.parseInt(text(header + 100, 8).trim() || '644', 8) & 0o755) | 0o600);
    }
  }
}

/**
 * Fetches a URL, retrying network errors and 5xx/429 answers with a backoff (1 s, 2 s, 4 s); a 4xx answer fails at once.
 */
async function fetchOk(url, as = 'bytes') {
  for (let attempt = 1; ; attempt += 1) {
    let problem;
    try {
      const response = await fetch(url);
      if (response.ok) return as === 'json' ? await response.json() : new Uint8Array(await response.arrayBuffer());
      if (response.status < 500 && response.status !== 429) fail(`${url}: HTTP ${response.status}`);
      problem = `HTTP ${response.status}`;
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
    }
    if (attempt >= FETCH_ATTEMPTS) fail(`${url}: ${problem} after ${FETCH_ATTEMPTS} attempts`);
    console.log(`  ${url}: ${problem}, retrying`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000 * 2 ** (attempt - 1)));
  }
}

/**
 * The SHA-512 nuget.org publishes for a package: `packageHash` (base64) of its catalog entry, found through the registration leaf.
 */
async function catalogHash({ id, version }) {
  const leaf = await fetchOk(`${REGISTRATION}/${id.toLowerCase()}/${version}.json`, 'json');
  const entry = await fetchOk(leaf.catalogEntry, 'json');
  if (entry.packageHashAlgorithm !== 'SHA512') fail(`${id} ${version}: catalog hash algorithm is ${entry.packageHashAlgorithm}, expected SHA512`);
  return { sha512: Buffer.from(entry.packageHash, 'base64').toString('hex'), catalogEntry: leaf.catalogEntry };
}

/**
 * A package's .nupkg from the cache when it matches its pin, otherwise downloaded and checked against the catalog (and the pin).
 */
async function nupkg(key, pins) {
  const { id, version } = PACKAGES[key];
  const url = `${NUGET}/${id.toLowerCase()}/${version}/${id.toLowerCase()}.${version}.nupkg`;
  const path = join(CACHE, 'nuget', `${id.toLowerCase()}.${version}.nupkg`);
  const pin = pins.find((entry) => entry.id === id && entry.version === version);
  if (pin && existsSync(path)) {
    const bytes = readFileSync(path);
    if (sha512(bytes) === pin.sha512) return { bytes, pin };
  }
  const published = await catalogHash({ id, version });
  const cached = existsSync(path) ? readFileSync(path) : undefined;
  const reuse = cached && sha512(cached) === published.sha512;
  const bytes = reuse ? cached : await fetchOk(url);
  const digest = sha512(bytes);
  if (digest !== published.sha512) fail(`${id} ${version}: SHA-512 ${digest} does not match the nuget.org catalog (${published.sha512})`);
  if (pin && pin.sha512 !== digest) fail(`${id} ${version}: nuget.org now serves a package that differs from the SHA-512 pinned in manifest.json`);
  mkdirSync(dirname(path), { recursive: true });
  if (!reuse) writeFileSync(path, bytes);
  console.log(`  ${reuse ? 'cached' : 'downloaded'} ${id} ${version} (${mebibytes(bytes.length)}), SHA-512 matches the nuget.org catalog`);
  return { bytes, pin: { id, version, url, catalogEntry: published.catalogEntry, sha512: digest } };
}

function machineRid() {
  const arch = { x64: 'x64', arm64: 'arm64' }[process.arch];
  const os = { linux: 'linux', darwin: 'osx', win32: 'win' }[process.platform];
  if (!arch || !os) fail(`no .NET runtime build for ${process.platform}-${process.arch}`);
  const musl = os === 'linux' && !process.report?.getReport?.().header?.glibcVersionRuntime;
  return `${os}${musl ? '-musl' : ''}-${arch}`;
}

/**
 * The .NET runtime pins for every toolchain RID, read from releases.json for the pinned version.
 */
async function runtimePins() {
  const releases = await fetchOk(RELEASES, 'json');
  const release = releases.releases.find((entry) => entry.runtime?.version === DOTNET);
  if (!release) fail(`.NET runtime ${DOTNET} is not in ${RELEASES}`);
  const pins = {};
  for (const rid of TOOLCHAIN_RIDS) {
    const extension = rid.startsWith('win') ? '.zip' : '.tar.gz';
    const file = release.runtime.files.find((entry) => entry.rid === rid && entry.name === `dotnet-runtime-${rid}${extension}`);
    if (file) pins[rid] = { url: file.url, sha512: file.hash.toLowerCase() };
  }
  return pins;
}

/**
 * The directory of an extracted .NET runtime for this machine, used to run csc.dll; downloaded and checked against releases.json when needed.
 */
async function toolchain(manifest) {
  const rid = machineRid();
  let pins = manifest.toolchain?.version === DOTNET ? manifest.toolchain.runtime : undefined;
  const directory = join(CACHE, 'toolchain', `dotnet-${DOTNET}-${rid}`);
  const marker = join(directory, '.verified');
  if (!ci && pins?.[rid] && existsSync(marker) && readFileSync(marker, 'utf8') === pins[rid].sha512) return { directory, pins };
  const published = await runtimePins();
  if (pins) {
    for (const [pinnedRid, pin] of Object.entries(pins)) {
      if (published[pinnedRid] && published[pinnedRid].sha512 !== pin.sha512) fail(`releases.json now lists a different SHA-512 for the ${pinnedRid} runtime than manifest.json`);
    }
  }
  pins = { ...published, ...pins };
  const pin = pins[rid];
  if (!pin) fail(`releases.json has no .NET runtime ${DOTNET} for ${rid}`);
  const archive = join(CACHE, 'toolchain', pin.url.split('/').pop());
  let bytes = existsSync(archive) ? readFileSync(archive) : undefined;
  if (!bytes || sha512(bytes) !== pin.sha512) {
    bytes = Buffer.from(await fetchOk(pin.url));
    if (sha512(bytes) !== pin.sha512) fail(`${pin.url}: SHA-512 does not match releases.json`);
    mkdirSync(dirname(archive), { recursive: true });
    writeFileSync(archive, bytes);
    console.log(`  downloaded .NET runtime ${DOTNET} ${rid} (${mebibytes(bytes.length)}), SHA-512 matches releases.json`);
  }
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  if (pin.url.endsWith('.zip')) {
    for (const [name, read] of unzip(bytes)) {
      if (name.endsWith('/')) continue;
      const target = resolve(directory, name);
      if (!target.startsWith(`${directory}${sep}`)) fail(`zip entry ${name} escapes the extraction directory`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, read());
    }
  } else {
    untarGz(bytes, directory);
  }
  writeFileSync(marker, pin.sha512);
  return { directory, pins };
}

/**
 * Writes the entries of a package whose names match `filter` under `destination`, keyed by the part after `prefix`.
 */
function extract(files, prefix, destination, filter = () => true) {
  rmSync(destination, { recursive: true, force: true });
  for (const [name, read] of files) {
    if (!name.startsWith(prefix) || name.endsWith('/')) continue;
    const rest = name.slice(prefix.length);
    if (!filter(rest)) continue;
    const target = resolve(destination, rest);
    if (!target.startsWith(`${destination}${sep}`)) fail(`package entry ${name} escapes the extraction directory`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, read());
  }
}

function entry(files, name, label) {
  const read = files.get(name);
  if (!read) fail(`${label} has no ${name}`);
  return read();
}

/**
 * Runs a .NET application (csc.dll, the Webcil converter) on the downloaded runtime, with invariant globalization (no libicu needed
 * on the build image) and no telemetry.
 */
function runDotnet(dotnetDirectory, args, label) {
  const executable = join(dotnetDirectory, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
  try {
    execFileSync(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DOTNET_ROOT: dotnetDirectory,
        DOTNET_CLI_TELEMETRY_OPTOUT: '1',
        DOTNET_NOLOGO: '1',
        DOTNET_ROLL_FORWARD: 'LatestPatch',
        DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1',
      },
    });
  } catch (error) {
    fail(`${label} failed:\n${error.stdout?.toString() ?? ''}${error.stderr?.toString() ?? ''}`);
  }
}

/**
 * Compiles one assembly with csc.dll on the downloaded runtime; deterministic, so the same sources give the same bytes.
 */
function csc(dotnetDirectory, cscDirectory, { output, sources, references, analyzers = [], target = 'library' }) {
  const options = [
    '-nologo', '-noconfig', '-nostdlib+', `-target:${target}`, '-deterministic+', '-optimize+', '-debug-', '-langversion:latest',
    '-nullable:enable', '-warnaserror+', '-unsafe+', `-pathmap:${HOST_SOURCES}=/dojo/host,${dirname(CONVERTER_SOURCE)}=/dojo/scripts`, `-out:${output}`,
    ...references.map((path) => `-r:${path}`),
    ...analyzers.map((path) => `-analyzer:${path}`),
    ...sources,
  ];
  const responseFile = `${output}.rsp`;
  writeFileSync(responseFile, options.map((option) => `"${option}"`).join('\n'));
  try {
    runDotnet(dotnetDirectory, [join(cscDirectory, 'csc.dll'), `@${responseFile}`], `csc for ${relative(ROOT, output)}`);
  } finally {
    rmSync(responseFile, { force: true });
  }
}

/**
 * Converts PE assemblies to Webcil `.wasm` files in one run of the converter: `pairs` maps each input .dll to its output .wasm.
 */
function webcil(dotnetDirectory, converter, pairs) {
  runDotnet(dotnetDirectory, [converter, ...pairs.flatMap(([input, output]) => [input, output])], 'the Webcil conversion');
}

/**
 * Removes cached downloads that no pinned package or runtime uses any more, so a version bump does not leave its predecessor in
 * vendor/dotnet/.cache, and on CI the extracted toolchain, which is rebuilt from its archive.
 */
function pruneCache(pins) {
  const packages = new Set(Object.values(PACKAGES).map(({ id, version }) => `${id.toLowerCase()}.${version}.nupkg`));
  const nuget = join(CACHE, 'nuget');
  for (const file of existsSync(nuget) ? readdirSync(nuget) : []) {
    if (!packages.has(file)) rmSync(join(nuget, file), { recursive: true, force: true });
  }
  const archives = new Set(Object.values(pins).map((pin) => pin.url.split('/').pop()));
  const toolchainDirectory = join(CACHE, 'toolchain');
  const current = `dotnet-${DOTNET}-${machineRid()}`;
  for (const file of existsSync(toolchainDirectory) ? readdirSync(toolchainDirectory) : []) {
    if (archives.has(file) || (file === current && !ci)) continue;
    rmSync(join(toolchainDirectory, file), { recursive: true, force: true });
  }
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const reason = staleReason(manifest);

if (check) {
  if (reason) fail(`${reason}; run npm run csharp:vendor`);
  if (manifest.size.brotli > BROTLI_BUDGET) fail(`the served set is ${mebibytes(manifest.size.brotli)} with Brotli ${BROTLI_QUALITY}, over the ${mebibytes(BROTLI_BUDGET)} budget`);
  console.log(`verified ${manifest.files.length} files for .NET ${DOTNET} + Roslyn ${ROSLYN}: ${mebibytes(manifest.size.bytes)} raw, ${mebibytes(manifest.size.brotli)} with Brotli ${BROTLI_QUALITY} (${mebibytes(manifest.size.brotli11)} at 11), budget ${mebibytes(BROTLI_BUDGET)}`);
  process.exit(0);
}
if (!reason) {
  console.log(`dotnet files up to date (${manifest.files.length} files for .NET ${DOTNET} + Roslyn ${ROSLYN}, ${mebibytes(manifest.size.brotli)} with Brotli ${BROTLI_QUALITY})`);
  process.exit(0);
}
const committedConfigReason = configReason(manifest);
if (ci && committedConfigReason) fail(`${committedConfigReason}. CI never rewrites vendor/dotnet/manifest.json: run npm run csharp:vendor locally and commit the manifest`);
console.log(`vendor-dotnet: rebuilding vendor/dotnet (${reason})`);

const previousPins = manifest.dotnet === DOTNET && manifest.roslyn === ROSLYN ? (manifest.packages ?? []) : [];
const packages = {};
for (const key of Object.keys(PACKAGES)) {
  const { bytes, pin } = await nupkg(key, previousPins);
  packages[key] = { files: unzip(bytes), pin };
}
const { directory: dotnetDirectory, pins: runtimePinsByRid } = await toolchain(manifest);

const work = join(CACHE, 'work');
const refPack = join(work, 'ref');
const analyzerDirectory = join(work, 'analyzers');
const cscDirectory = join(work, 'csc');
const roslynDirectory = join(work, 'roslyn');
extract(packages.ref.files, `ref/net${DOTNET.split('.').slice(0, 2).join('.')}/`, refPack, (name) => name.endsWith('.dll') && !name.includes('/'));
extract(packages.ref.files, 'analyzers/dotnet/cs/', analyzerDirectory, (name) => ANALYZERS.includes(name));
extract(packages.toolset.files, 'tasks/netcore/bincore/', cscDirectory, (name) => !name.includes('/'));
const roslynLib = `lib/net${DOTNET.split('.')[0]}.0/`;
rmSync(roslynDirectory, { recursive: true, force: true });
mkdirSync(roslynDirectory, { recursive: true });
writeFileSync(join(roslynDirectory, 'Microsoft.CodeAnalysis.dll'), entry(packages.common.files, `${roslynLib}Microsoft.CodeAnalysis.dll`, PACKAGES.common.id));
writeFileSync(join(roslynDirectory, 'Microsoft.CodeAnalysis.CSharp.dll'), entry(packages.csharp.files, `${roslynLib}Microsoft.CodeAnalysis.CSharp.dll`, PACKAGES.csharp.id));

const sources = hostSources();
const allReferences = readdirSync(refPack).sort().map((file) => join(refPack, file));
const hostOutput = join(work, 'host');
mkdirSync(hostOutput, { recursive: true });
const testingDll = join(hostOutput, 'Dojo.Testing.dll');
const hostDll = join(hostOutput, 'DojoHost.dll');
const sourceFiles = Object.keys(sources);
for (const file of TESTING_SOURCES) {
  if (!sourceFiles.includes(file)) fail(`src/engines/csharp/host/${file} is missing`);
}
csc(dotnetDirectory, cscDirectory, { output: testingDll, sources: TESTING_SOURCES.map((file) => join(HOST_SOURCES, file)), references: allReferences });
csc(dotnetDirectory, cscDirectory, {
  output: hostDll,
  sources: sourceFiles.filter((file) => !TESTING_SOURCES.includes(file)).map((file) => join(HOST_SOURCES, file)),
  references: [...allReferences, testingDll, join(roslynDirectory, 'Microsoft.CodeAnalysis.dll'), join(roslynDirectory, 'Microsoft.CodeAnalysis.CSharp.dll')],
  analyzers: ANALYZERS.map((file) => join(analyzerDirectory, file)),
});

// The Webcil converter: WebcilConvert.cs compiled against the reference pack and the SDK pack's converter library, run from its own folder.
const converterDirectory = join(work, 'webcil');
const converterDll = join(converterDirectory, 'WebcilConvert.dll');
mkdirSync(converterDirectory, { recursive: true });
writeFileSync(join(converterDirectory, WEBCIL_LIBRARY), entry(packages.webassembly.files, `tools/net${DOTNET.split('.')[0]}.0/${WEBCIL_LIBRARY}`, PACKAGES.webassembly.id));
csc(dotnetDirectory, cscDirectory, { output: converterDll, target: 'exe', sources: [CONVERTER_SOURCE], references: [...allReferences, join(converterDirectory, WEBCIL_LIBRARY)] });
writeFileSync(join(converterDirectory, 'WebcilConvert.runtimeconfig.json'), JSON.stringify({ runtimeOptions: { tfm: `net${DOTNET.split('.').slice(0, 2).join('.')}`, framework: { name: 'Microsoft.NETCore.App', version: DOTNET } } }));

const runtimeNative = 'runtimes/browser-wasm/native/';
const runtimeLib = `runtimes/browser-wasm/lib/net${DOTNET.split('.').slice(0, 2).join('.')}/`;
const peDirectory = join(work, 'pe');
const webcilDirectory = join(work, 'wasm');
mkdirSync(peDirectory, { recursive: true });
mkdirSync(webcilDirectory, { recursive: true });
// Booted assemblies as PE files (published path → bytes), converted to Webcil below.
const assemblies = new Map();
assemblies.set(wasmName(CORE_LIBRARY), entry(packages.runtime.files, `${runtimeNative}${CORE_LIBRARY}`, PACKAGES.runtime.id));
for (const file of ASSEMBLIES) {
  const bytes = file.startsWith('Microsoft.CodeAnalysis') ? readFileSync(join(roslynDirectory, file)) : entry(packages.runtime.files, `${runtimeLib}${file}`, PACKAGES.runtime.id);
  assemblies.set(`assemblies/${wasmName(file)}`, bytes);
}
assemblies.set('assemblies/Dojo.Testing.wasm', readFileSync(testingDll));
assemblies.set('assemblies/DojoHost.wasm', readFileSync(hostDll));
const pairs = [...assemblies].map(([path, bytes]) => {
  const name = path.split('/').pop().replace(/\.wasm$/, '.dll');
  writeFileSync(join(peDirectory, name), bytes);
  return [join(peDirectory, name), join(webcilDirectory, wasmName(name))];
});
webcil(dotnetDirectory, converterDll, pairs);

const contents = new Map();
for (const file of RUNTIME_FILES) contents.set(file, entry(packages.runtime.files, `${runtimeNative}${file}`, PACKAGES.runtime.id));
for (const path of assemblies.keys()) contents.set(path, readFileSync(join(webcilDirectory, path.split('/').pop())));
for (const file of REFERENCES) {
  if (!existsSync(join(refPack, file))) fail(`${PACKAGES.ref.id} has no reference assembly ${file}`);
  contents.set(`ref/${wasmName(file)}`, wrapReference(readFileSync(join(refPack, file))));
}
contents.set('ref/Dojo.Testing.wasm', wrapReference(readFileSync(testingDll)));
contents.set('licenses/dotnet-LICENSE.TXT', entry(packages.runtime.files, 'LICENSE.TXT', PACKAGES.runtime.id));
contents.set('licenses/dotnet-THIRD-PARTY-NOTICES.TXT', entry(packages.runtime.files, 'THIRD-PARTY-NOTICES.TXT', PACKAGES.runtime.id));
contents.set('licenses/roslyn-ThirdPartyNotices.rtf', entry(packages.common.files, 'ThirdPartyNotices.rtf', PACKAGES.common.id));

const layout = servedLayout();
for (const path of servedFiles()) {
  if (!layout.has(path)) rmSync(join(VENDOR, path));
}
const written = [];
for (const [path, role] of layout) {
  const bytes = contents.get(path);
  if (!bytes) fail(`no source for ${path}`);
  if (path.endsWith('.dll')) fail(`${path}: no .dll is served`);
  mkdirSync(dirname(join(VENDOR, path)), { recursive: true });
  writeFileSync(join(VENDOR, path), bytes);
  written.push({ path, role, bytes });
}
rmSync(work, { recursive: true, force: true });
pruneCache(runtimePinsByRid);
written.sort((left, right) => left.path.localeCompare(right.path));
const version = setVersion(written.map(({ path, bytes }) => ({ path, sha256: sha256(bytes) })));
if (ci) {
  const committed = (manifest.files ?? []).map(({ path, sha256: digest }) => `${path} ${digest}`).join('\n');
  if (manifest.version !== version || committed !== written.map(({ path, bytes }) => `${path} ${sha256(bytes)}`).join('\n')) {
    fail('the rebuilt files differ from vendor/dotnet/manifest.json. CI never rewrites the manifest: run npm run csharp:vendor locally and commit it');
  }
  console.log(`vendor-dotnet: rebuilt ${written.length} files, identical to vendor/dotnet/manifest.json (version ${version})`);
  process.exit(0);
}
// Sizes are measured only when the manifest is written (Brotli 11 over the whole set takes a while).
const files = written.map(({ path, role, bytes }) => ({
  path,
  role,
  sha256: sha256(bytes),
  bytes: bytes.length,
  brotli: role === 'license' ? 0 : brotliSize(bytes, BROTLI_QUALITY),
  brotli11: role === 'license' ? 0 : brotliSize(bytes, 11),
}));
const served = files.filter((file) => file.role !== 'license');
const total = (key, group = served) => group.reduce((sum, file) => sum + file[key], 0);
const size = { files: files.length, bytes: total('bytes'), brotli: total('brotli'), brotli11: total('brotli11'), brotliQuality: BROTLI_QUALITY, budget: BROTLI_BUDGET };
const next = {
  dotnet: DOTNET,
  roslyn: ROSLYN,
  version,
  packages: Object.values(packages).map(({ pin }) => pin),
  toolchain: { version: DOTNET, source: RELEASES, runtime: runtimePinsByRid },
  host: { sources },
  build: buildInputs(),
  size,
  files,
};
writeFileSync(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);

const byRole = (role) => served.filter((file) => file.role === role || (role === 'assembly' && file.role === 'host'));
console.log(`vendored ${files.length} files for .NET ${DOTNET} + Roslyn ${ROSLYN} (version ${version}): ${mebibytes(size.bytes)} raw, ${mebibytes(size.brotli)} with Brotli ${BROTLI_QUALITY} (budget ${mebibytes(BROTLI_BUDGET)}), ${mebibytes(size.brotli11)} with Brotli 11`);
for (const [label, role] of [['runtime', 'runtime'], ['core', 'core'], ['assemblies', 'assembly'], ['references', 'reference']]) {
  const group = byRole(role);
  console.log(`  ${label.padEnd(10)} ${String(group.length).padStart(3)} files  ${mebibytes(total('bytes', group)).padStart(10)} raw  ${mebibytes(total('brotli', group)).padStart(10)} q${BROTLI_QUALITY}  ${mebibytes(total('brotli11', group)).padStart(10)} q11`);
}
if (size.brotli > BROTLI_BUDGET) fail(`the served set is ${mebibytes(size.brotli)} with Brotli ${BROTLI_QUALITY}, over the ${mebibytes(BROTLI_BUDGET)} budget`);
