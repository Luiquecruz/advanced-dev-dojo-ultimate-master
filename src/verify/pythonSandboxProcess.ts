/**
 * The only `process` a sandbox child keeps on `globalThis` once Pyodide is loaded: the read-only fields Pyodide reads, no methods that act on the host.
 */
export function processAllowList(host: NodeJS.Process): object {
  return Object.freeze({
    argv: Object.freeze([]),
    env: Object.freeze({}),
    version: host.version,
    versions: Object.freeze({ ...host.versions }),
    platform: host.platform,
    arch: host.arch,
    release: Object.freeze({ name: host.release.name }),
  });
}
