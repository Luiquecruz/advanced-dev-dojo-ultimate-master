const { createWorkspace } = mod;

function workspacePackages(utilsSource = 'export const sum = (first, second) => first + second;') {
  return [
    { name: 'web', path: 'apps/web', dependencies: ['design-system', 'utils'], files: { 'src/main.tsx': 'render(<App />);' } },
    { name: 'admin', path: 'apps/admin', dependencies: ['design-system'], files: { 'src/main.tsx': 'render(<Admin />);' } },
    { name: 'design-system', path: 'packages/design-system', dependencies: ['config'], files: { 'src/index.ts': 'export { Button } from "./Button";', 'src/Button.tsx': 'export function Button() {}' } },
    { name: 'utils', path: 'packages/utils', dependencies: ['config'], files: { 'src/index.ts': utilsSource } },
    { name: 'config', path: 'packages/config', dependencies: [], files: { 'tsconfig.json': '{ "strict": true }' } },
  ];
}

test('affectedBy returns the changed package and every package that depends on it, sorted', () => {
  const workspace = createWorkspace(workspacePackages());
  expect(workspace.affectedBy(['packages/design-system/src/Button.tsx'])).toEqual(['admin', 'design-system', 'web']);
  expect(workspace.affectedBy(['packages/utils/src/index.ts', 'apps/admin/src/main.tsx'])).toEqual(['admin', 'utils', 'web']);
  expect(workspace.affectedBy(['packages/config/tsconfig.json'])).toEqual(['admin', 'config', 'design-system', 'utils', 'web']);
  expect(workspace.affectedBy(['README.md', 'packages/utils-legacy/index.ts'])).toEqual([]);
});

test('buildOrder puts dependencies first and groups packages that can build in parallel', () => {
  const workspace = createWorkspace(workspacePackages());
  expect(workspace.buildOrder(['web'])).toEqual([['config'], ['design-system', 'utils'], ['web']]);
  expect(workspace.buildOrder(['admin'])).toEqual([['config'], ['design-system'], ['admin']]);
  expect(workspace.buildOrder(['web', 'admin'])).toEqual([['config'], ['design-system', 'utils'], ['admin', 'web']]);
});

test('buildOrder throws with the cycle path when packages depend on each other', () => {
  const workspace = createWorkspace([
    { name: 'app', path: 'apps/app', dependencies: ['a'], files: {} },
    { name: 'a', path: 'packages/a', dependencies: ['b'], files: {} },
    { name: 'b', path: 'packages/b', dependencies: ['c'], files: {} },
    { name: 'c', path: 'packages/c', dependencies: ['a'], files: {} },
  ]);
  expect(() => workspace.buildOrder(['app'])).toThrow('Dependency cycle: a -> b -> c -> a');
});

test('run builds in dependency order and replays every output from the cache on the second run', async () => {
  const workspace = createWorkspace(workspacePackages());
  const cache = new Map();
  const build = fn((workspacePackage) => `dist of ${workspacePackage.name}`);

  const firstRun = await workspace.run(['web', 'admin'], { cache, build });
  expect(firstRun.built).toEqual(['config', 'design-system', 'utils', 'admin', 'web']);
  expect(firstRun.cached).toEqual([]);
  expect(firstRun.outputs.web).toBe('dist of web');
  expect(build).toHaveBeenCalledTimes(5);

  const secondRun = await workspace.run(['web', 'admin'], { cache, build });
  expect(secondRun.built).toEqual([]);
  expect(secondRun.cached).toEqual(['config', 'design-system', 'utils', 'admin', 'web']);
  expect(secondRun.outputs).toEqual(firstRun.outputs);
  expect(build).toHaveBeenCalledTimes(5);
});

test('changing a package invalidates only that package and its dependents', async () => {
  const cache = new Map();
  const build = fn((workspacePackage) => `dist of ${workspacePackage.name}`);
  await createWorkspace(workspacePackages()).run(['web', 'admin'], { cache, build });
  build.mockClear();

  const changedWorkspace = createWorkspace(workspacePackages('export const sum = (...values) => values.reduce((total, value) => total + value, 0);'));
  const result = await changedWorkspace.run(['web', 'admin'], { cache, build });
  expect(result.built).toEqual(['utils', 'web']);
  expect(result.cached).toEqual(['config', 'design-system', 'admin']);
  expect(build.mock.calls.map(([workspacePackage]) => workspacePackage.name)).toEqual(['utils', 'web']);
});
