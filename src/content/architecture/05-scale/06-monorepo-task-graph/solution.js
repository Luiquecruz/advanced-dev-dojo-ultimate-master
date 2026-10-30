function packageOwnsPath(workspacePackage, changedPath) {
  return changedPath === workspacePackage.path || changedPath.startsWith(`${workspacePackage.path}/`);
}

function hashText(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createWorkspace(packages) {
  const packagesByName = new Map(packages.map((workspacePackage) => [workspacePackage.name, workspacePackage]));

  const dependentsByName = new Map(packages.map((workspacePackage) => [workspacePackage.name, []]));
  for (const workspacePackage of packages) {
    for (const dependencyName of workspacePackage.dependencies) {
      dependentsByName.get(dependencyName).push(workspacePackage.name);
    }
  }

  function affectedBy(changedPaths) {
    const affected = new Set();
    const pending = packages
      .filter((workspacePackage) => changedPaths.some((changedPath) => packageOwnsPath(workspacePackage, changedPath)))
      .map((workspacePackage) => workspacePackage.name);
    while (pending.length > 0) {
      const packageName = pending.pop();
      if (affected.has(packageName)) continue;
      affected.add(packageName);
      pending.push(...dependentsByName.get(packageName));
    }
    return [...affected].sort();
  }

  function buildOrder(targets) {
    const levelByName = new Map();
    const visitingPath = [];

    function visit(packageName) {
      if (levelByName.has(packageName)) return levelByName.get(packageName);
      const cycleStart = visitingPath.indexOf(packageName);
      if (cycleStart !== -1) {
        const cyclePath = [...visitingPath.slice(cycleStart), packageName];
        throw new Error(`Dependency cycle: ${cyclePath.join(' -> ')}`);
      }
      visitingPath.push(packageName);
      const dependencyLevels = packagesByName.get(packageName).dependencies.map(visit);
      visitingPath.pop();
      const level = dependencyLevels.length === 0 ? 0 : Math.max(...dependencyLevels) + 1;
      levelByName.set(packageName, level);
      return level;
    }

    targets.forEach(visit);

    const levels = [];
    for (const [packageName, level] of levelByName) {
      levels[level] = [...(levels[level] ?? []), packageName];
    }
    return levels.filter(Boolean).map((level) => level.sort());
  }

  async function run(targets, { cache, build }) {
    const hashByName = new Map();
    const outputs = {};
    const built = [];
    const cached = [];

    for (const level of buildOrder(targets)) {
      const results = await Promise.all(
        level.map(async (packageName) => {
          const workspacePackage = packagesByName.get(packageName);
          const fileInputs = Object.keys(workspacePackage.files)
            .sort()
            .map((filePath) => `${filePath}\n${workspacePackage.files[filePath]}`);
          const dependencyInputs = [...workspacePackage.dependencies]
            .sort()
            .map((dependencyName) => `${dependencyName}@${hashByName.get(dependencyName)}`);
          const hash = hashText([packageName, ...fileInputs, ...dependencyInputs].join('\0'));
          if (cache.has(hash)) {
            return { packageName, hash, output: cache.get(hash), fromCache: true };
          }
          const output = await build(workspacePackage);
          cache.set(hash, output);
          return { packageName, hash, output, fromCache: false };
        }),
      );
      for (const { packageName, hash, output, fromCache } of results) {
        hashByName.set(packageName, hash);
        outputs[packageName] = output;
        (fromCache ? cached : built).push(packageName);
      }
    }

    return { built, cached, outputs };
  }

  return { affectedBy, buildOrder, run };
}
