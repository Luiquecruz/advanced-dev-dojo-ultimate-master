The return types are `asserts condition` and `asserts value is string`. The bodies only throw; they never return a value.
---
Destructure first: `const { host, port } = raw;`. Local constants narrow reliably after each assertion call.
---
`assertIsString(host, 'host'); invariant(typeof port === 'number' && port > 0, 'port must be a positive number'); return { host, port };`
