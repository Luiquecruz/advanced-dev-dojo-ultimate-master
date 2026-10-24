`watch(userId, (newId, oldId) => { ... }, { immediate: true })` runs once on setup and again on every change. The callback can be `async`.
---
On the immediate run `oldId` is `undefined`, so only push into `changes.value` when it is defined.
---
`watchEffect(() => { document.title = \`User ${userId.value}\`; })` tracks `userId` automatically because it reads `.value` while running.
