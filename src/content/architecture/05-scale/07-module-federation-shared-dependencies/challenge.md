Write the version negotiation the Module Federation runtime performs when a host and its remotes put their `shared` modules into one share scope.

Export two functions from `sharedScope.js`. Versions are always `major.minor.patch` numbers; `compareVersions(first, second)` is already written for you.

**`satisfies(version, range)`**: a small semver subset.

| Range | Accepts |
| --- | --- |
| `*` | every version |
| `19.1.0` | exactly `19.1.0` |
| `>=18.2.0` | `18.2.0` and anything higher |
| `~7.4.2` | `>=7.4.2` with the same major and minor (`7.4.x`) |
| `^19.1.0` | `>=19.1.0` with the same major (`19.x.x`) |
| `^0.2.1` | `>=0.2.1` with major `0` and the same minor (`0.2.x`) |
| `^0.0.3` | exactly `0.0.3` |

**`resolveSharedScope(containers)`**

Each container is `{ name, shared }`, where `shared` maps a module name to `{ version, requiredVersion?, singleton?, strictVersion? }`. The first container is the host. Every container that declares a module both **provides** its `version` and **consumes** the module with its `requiredVersion` (a missing `requiredVersion` accepts any version). When several containers provide the same version, the first one in the list is its provider.

Returns `{ selected, warnings, errors }`. For every shared module, `selected[moduleName]` is:

```js
{ version: '19.1.0', from: 'checkout', loaded: ['19.1.0'], consumers: { shell: '19.1.0', checkout: '19.1.0' } }
```

- `consumers`: container name → the version that container gets.
- `loaded`: the distinct versions in `consumers`, highest first.
- `version` and `from`: `loaded[0]` and the container that provides it.

Rules:

- **Not a singleton**: each consumer gets the highest provided version its `requiredVersion` accepts. When none is accepted it falls back to its own `version`, so several copies may load.
- **Singleton** (any declaration has `singleton: true`): every consumer gets the highest provided version. For each consumer whose `requiredVersion` rejects it, push `{ module, container, requiredVersion, version }` into `errors` when that consumer has `strictVersion: true`, otherwise into `warnings`.
- Report problems in the order modules are first declared, then in container order.
