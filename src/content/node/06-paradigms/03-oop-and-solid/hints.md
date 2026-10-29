Each notifier only maps a `Message` to a `Delivery` and awaits `this.transport(...)`. The constructor parameter property `private readonly transport` already stores it.
---
For SMS: `message.body.length <= 160 ? message.body : message.body.slice(0, 157) + '...'`. A named constant (`SMS_LIMIT`) keeps the numbers honest.
---
In `NotificationService`, keep a `Map<string, Notifier>` field. In the constructor loop over the notifiers, throw when `map.has(notifier.channel)`, otherwise `set` it. `channels()` is `[...this.byChannel.keys()]` (a `Map` keeps insertion order).
---
`notify` reads `this.byChannel.get(channel)`; when it is `undefined`, `throw new Error(\`Unsupported channel: ${channel}\`)` (inside an `async` method a throw becomes a rejection), otherwise `await notifier.send(message)`.
