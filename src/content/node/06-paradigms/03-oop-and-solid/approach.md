1. Start from the contract: every notifier exposes `channel` and `send(message)`. The service will only ever talk to that interface.
2. Implement `EmailNotifier.send` as a pure mapping from `Message` to `Delivery`, then await the injected transport.
3. Implement `SmsNotifier.send` the same way and add the one rule that differs: the 160 character limit, keeping the total length at exactly 160 when truncating.
4. In `NotificationService`, index notifiers in a `Map` keyed by `channel`. Validate in the constructor (duplicates) so a misconfiguration fails at startup, not on the first message.
5. `channels()` reads the map keys; a `Map` preserves insertion order.
6. `notify` looks up the strategy and delegates. It never checks which channel it is, so a plain `{ channel: 'push', send }` object works without touching the class.
