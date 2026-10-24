interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications?: boolean;
  fontSize?: number;
}

const DEFAULT_SETTINGS: Readonly<Required<UserSettings>> = {
  theme: 'light',
  language: 'en',
  notifications: true,
  fontSize: 16,
};

function updateSettings(current: Readonly<UserSettings>, changes: Partial<UserSettings>): Readonly<UserSettings> {
  return Object.freeze({ ...current, ...changes });
}

function resolveSettings(settings: Partial<UserSettings>): Required<UserSettings> {
  return {
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
    language: settings.language ?? DEFAULT_SETTINGS.language,
    notifications: settings.notifications ?? DEFAULT_SETTINGS.notifications,
    fontSize: settings.fontSize ?? DEFAULT_SETTINGS.fontSize,
  };
}
