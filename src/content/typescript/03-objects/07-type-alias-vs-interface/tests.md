## pattern: NotificationChannel is a type alias

```regex
\btype\s+NotificationChannel\s*=
```

## pattern: NotificationPreferences is an interface

```regex
\binterface\s+NotificationPreferences\b
```

## type: NotificationChannel and ChannelToggle have the expected types

```ts
type _ = [
  Expect<Equal<NotificationChannel, 'email' | 'sms' | 'push'>>,
  Expect<Equal<ChannelToggle, [NotificationChannel, boolean]>>,
];
```

## type: NotificationPreferences accepts optional quiet hours and rejects unknown channels

```ts
const basic: NotificationPreferences = { userId: 'u1', enabledChannels: ['email'] };
const withQuietHours: NotificationPreferences = { userId: 'u2', enabledChannels: [], quietHours: { startHour: 22, endHour: 7 } };
// @ts-expect-error
const invalidChannel: NotificationPreferences = { userId: 'u3', enabledChannels: ['fax'] };
```

## runtime: applyToggle enables a channel once

```js
const preferences = { userId: 'u1', enabledChannels: ['email'] };
assert.deepEqual(applyToggle(preferences, ['push', true]), { userId: 'u1', enabledChannels: ['email', 'push'] });
assert.deepEqual(applyToggle(preferences, ['email', true]).enabledChannels, ['email']);
assert.deepEqual(preferences.enabledChannels, ['email']);
```

## runtime: applyToggle disables a channel and keeps other fields

```js
const preferences = { userId: 'u1', enabledChannels: ['email', 'push'], quietHours: { startHour: 22, endHour: 7 } };
assert.deepEqual(applyToggle(preferences, ['email', false]), { userId: 'u1', enabledChannels: ['push'], quietHours: { startHour: 22, endHour: 7 } });
assert.deepEqual(applyToggle(preferences, ['sms', false]).enabledChannels, ['email', 'push']);
```
