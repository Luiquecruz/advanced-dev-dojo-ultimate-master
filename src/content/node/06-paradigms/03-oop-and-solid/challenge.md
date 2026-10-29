Replace a channel `if/else` chain with the **strategy pattern**. The starter declares the contract:

```ts
interface Message { to: string; body: string }
interface Delivery { channel: string; to: string; text: string }
type Transport = (delivery: Delivery) => Promise<void>;
interface Notifier { readonly channel: string; send(message: Message): Promise<void> }
```

Implement and export:

1. `class EmailNotifier implements Notifier`: `channel` is `'email'`; the constructor receives a `Transport`; `send` calls it with `{ channel: 'email', to, text: body }`.
2. `class SmsNotifier implements Notifier`: `channel` is `'sms'`; same constructor; `send` calls the transport with `{ channel: 'sms', to, text }` where `text` is the body when it has at most 160 characters, otherwise its first 157 characters followed by `'...'` (160 in total).
3. `class NotificationService`:
   - `constructor(notifiers: Notifier[])` indexes the notifiers by `channel`. Registering two notifiers for the same channel throws `Error('Duplicate notifier for channel: <channel>')`.
   - `channels()` returns the registered channel names in registration order.
   - `async notify(channel, message)` delegates to the matching notifier. An unknown channel rejects with `Error('Unsupported channel: <channel>')`.

`NotificationService` must work with **any** `Notifier`, including a plain object such as `{ channel: 'push', send }`: it may not mention `'email'` or `'sms'`.
