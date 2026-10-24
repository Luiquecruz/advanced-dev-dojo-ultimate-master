Pick the right construct for each declaration:

1. `NotificationChannel` — the union `'email' | 'sms' | 'push'` (**type alias**).
2. `NotificationPreferences` — an **interface** with `userId: string`,
   `enabledChannels: NotificationChannel[]` and an optional `quietHours` object
   `{ startHour: number; endHour: number }`.
3. `ChannelToggle` — a tuple `[channel: NotificationChannel, enabled: boolean]` (**type alias**).
4. `applyToggle(preferences: NotificationPreferences, toggle: ChannelToggle): NotificationPreferences` returns
   **new** preferences: when enabled, append the channel if it is not there yet; when disabled, remove it.

```ts
applyToggle({ userId: 'u1', enabledChannels: ['email'] }, ['push', true]);
// { userId: 'u1', enabledChannels: ['email', 'push'] }
applyToggle({ userId: 'u1', enabledChannels: ['email', 'push'] }, ['email', false]);
// { userId: 'u1', enabledChannels: ['push'] }
```
