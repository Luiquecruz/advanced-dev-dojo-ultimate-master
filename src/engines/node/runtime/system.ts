import * as path from './path';

const CPU = { model: 'Dojo Virtual CPU', speed: 3000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } };

export const os = {
  EOL: '\n',
  platform: () => 'linux',
  type: () => 'Linux',
  arch: () => 'x64',
  release: () => '6.8.0',
  hostname: () => 'dojo',
  homedir: () => '/home/dojo',
  tmpdir: () => '/tmp',
  cpus: () => Array.from({ length: 4 }, () => ({ ...CPU })),
  availableParallelism: () => 4,
  totalmem: () => 8 * 1024 ** 3,
  freemem: () => 5 * 1024 ** 3,
  uptime: () => 3600,
  loadavg: () => [0.4, 0.3, 0.2],
  userInfo: () => ({ username: 'dojo', uid: 1000, gid: 1000, shell: '/bin/sh', homedir: '/home/dojo' }),
};

export const url = {
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  fileURLToPath: (value: string | URL) => decodeURIComponent(new URL(value).pathname),
  pathToFileURL: (value: string) => new URL(`file://${encodeURI(path.resolve(value))}`),
};

export const querystring = {
  parse: (text: string) => Object.fromEntries(new URLSearchParams(text)),
  stringify: (values: Record<string, string | number | boolean>) => new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString(),
};
