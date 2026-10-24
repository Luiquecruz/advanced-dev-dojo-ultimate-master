1. Declare `type NotificationChannel = "email" | "sms" | "push";`.
2. Convert `NotificationPreferences` to an interface and add the optional `quietHours` property.
3. Declare `type ChannelToggle = [channel: NotificationChannel, enabled: boolean];`.
4. In `applyToggle`, compute the new channel list and return `{ ...preferences, enabledChannels }`.
