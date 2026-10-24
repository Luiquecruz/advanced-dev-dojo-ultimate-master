type NotificationChannel = 'email' | 'sms' | 'push';

interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  quietHours?: { startHour: number; endHour: number };
}

type ChannelToggle = [channel: NotificationChannel, enabled: boolean];

function applyToggle(preferences: NotificationPreferences, toggle: ChannelToggle): NotificationPreferences {
  const [channel, enabled] = toggle;
  const withoutChannel = preferences.enabledChannels.filter((existing) => existing !== channel);
  return { ...preferences, enabledChannels: enabled ? [...withoutChannel, channel] : withoutChannel };
}
