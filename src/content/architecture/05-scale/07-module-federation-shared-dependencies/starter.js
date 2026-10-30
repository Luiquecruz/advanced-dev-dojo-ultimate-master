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
  // TODO: '*' accepts every version
  // TODO: '>=1.2.0' accepts 1.2.0 and anything higher
  // TODO: '~1.2.0' accepts >=1.2.0 with the same major and minor
  // TODO: '^1.2.0' accepts >=1.2.0 with the same major; '^0.2.0' keeps the minor; '^0.0.3' is exact
  return compareVersions(version, range) === 0;
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
    // TODO: collect the provided versions; the first container that provides a version is its provider
    // TODO: singleton: every consumer gets the highest provided version; report consumers whose requiredVersion rejects it
    //       as { module, container, requiredVersion, version } in warnings, or in errors when strictVersion is true
    // TODO: not a singleton: each consumer gets the highest provided version its requiredVersion accepts, or its own version
    // TODO: loaded lists the distinct versions in use, highest first; version and from describe loaded[0]
    const { containerName, config } = declarations[0];
    selected[moduleName] = { version: config.version, from: containerName, loaded: [config.version], consumers: {} };
  }

  return { selected, warnings, errors };
}
