The effect function receives a cleanup registrar: `effect((onCleanup) => { ... })`.
---
`const author = untracked(this.author);` reads the value without making it a dependency. Read `this.draft()` normally so typing triggers the effect.
---
`const timer = setTimeout(() => this.saved.update(list => [...list, \`${author}: ${text}\`]), this.delayMs); onCleanup(() => clearTimeout(timer));`
