// TODO: restrict to 'email' | 'sms' | 'push'
type NotificationChannel = string;

// TODO: turn into an interface, use NotificationChannel and add the optional quietHours object
type NotificationPreferences = {
  userId: string;
  enabledChannels: string[];
};

// TODO: a labeled tuple [channel: NotificationChannel, enabled: boolean]
type ChannelToggle = unknown[];

function applyToggle(preferences: NotificationPreferences, toggle: ChannelToggle): NotificationPreferences {
  // TODO: return new preferences with the channel added or removed
  return preferences;
}
