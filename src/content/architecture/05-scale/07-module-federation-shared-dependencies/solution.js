function parseVersion(version) {
  return version.split('.').map(Number);
}

export function compareVersions(firstVersion, secondVersion) {
  const firstParts = parseVersion(firstVersion);
  const secondParts = parseVersion(secondVersion);
  for (let index = 0; index < 3; index += 1) {
    if (firstParts[index] !== secondParts[index]) return firstParts[index] - secondParts[index];
  }
  return 0;
}

export function satisfies(version, range) {
  if (range === '*') return true;
  if (range.startsWith('>=')) return compareVersions(version, range.slice(2)) >= 0;
  if (!range.startsWith('^') && !range.startsWith('~')) return compareVersions(version, range) === 0;

  const baseVersion = range.slice(1);
  if (compareVersions(version, baseVersion) < 0) return false;
  const [major, minor] = parseVersion(version);
  const [baseMajor, baseMinor, basePatch] = parseVersion(baseVersion);

  if (range.startsWith('~')) return major === baseMajor && minor === baseMinor;
  if (baseMajor > 0) return major === baseMajor;
  if (baseMinor > 0) return major === 0 && minor === baseMinor;
  return compareVersions(version, `0.0.${basePatch}`) === 0;
}

function acceptsVersion(config, version) {
  return config.requiredVersion === undefined || satisfies(version, config.requiredVersion);
}

function highestFirst(versions) {
  return [...versions].sort((firstVersion, secondVersion) => compareVersions(secondVersion, firstVersion));
}

export function resolveSharedScope(containers) {
  const declarationsByModule = new Map();
  for (const container of containers) {
    for (const [moduleName, config] of Object.entries(container.shared)) {
      const declarations = declarationsByModule.get(moduleName) ?? [];
      declarations.push({ containerName: container.name, config });
      declarationsByModule.set(moduleName, declarations);
    }
  }

  const selected = {};
  const warnings = [];
  const errors = [];

  for (const [moduleName, declarations] of declarationsByModule) {
    const providerByVersion = new Map();
    for (const { containerName, config } of declarations) {
      if (!providerByVersion.has(config.version)) providerByVersion.set(config.version, containerName);
    }
    const providedVersions = highestFirst(providerByVersion.keys());
    const isSingleton = declarations.some(({ config }) => config.singleton);
    const consumers = {};

    for (const { containerName, config } of declarations) {
      if (isSingleton) {
        const singletonVersion = providedVersions[0];
        consumers[containerName] = singletonVersion;
        if (acceptsVersion(config, singletonVersion)) continue;
        const problem = { module: moduleName, container: containerName, requiredVersion: config.requiredVersion, version: singletonVersion };
        (config.strictVersion ? errors : warnings).push(problem);
      } else {
        consumers[containerName] = providedVersions.find((version) => acceptsVersion(config, version)) ?? config.version;
      }
    }

    const loaded = highestFirst(new Set(Object.values(consumers)));
    selected[moduleName] = { version: loaded[0], from: providerByVersion.get(loaded[0]), loaded, consumers };
  }

  return { selected, warnings, errors };
}
