export function createWorkspace(packages) {
  const packagesByName = new Map(packages.map((workspacePackage) => [workspacePackage.name, workspacePackage]));

  function affectedBy(changedPaths) {
    // TODO: find the packages whose path owns a changed file ('packages/utils' owns 'packages/utils/src/index.ts')
    // TODO: add every package that depends on an affected package, transitively, and return the names sorted
    return [];
  }

  function buildOrder(targets) {
    // TODO: collect the targets and all their dependencies, transitively
    // TODO: throw new Error('Dependency cycle: a -> b -> a') when a package depends on itself through the graph
    // TODO: level 0 holds packages without dependencies; any other package sits one level above its deepest dependency
    // TODO: return the levels in order, each one sorted by name
    return [targets];
  }

  async function run(targets, { cache, build }) {
    const outputs = {};
    const built = [];
    const cached = [];

    for (const level of buildOrder(targets)) {
      for (const packageName of level) {
        // TODO: hash the package name, its files and the hashes of its dependencies
        // TODO: on a cache hit, replay the cached output and record the package in `cached` instead of building it
        const output = await build(packagesByName.get(packageName));
        outputs[packageName] = output;
        built.push(packageName);
      }
    }

    return { built, cached, outputs };
  }

  return { affectedBy, buildOrder, run };
}
