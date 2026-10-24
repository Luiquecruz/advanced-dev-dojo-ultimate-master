interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications?: boolean;
  fontSize?: number;
}

// TODO: type as Readonly<Required<UserSettings>> and add every default value
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'en',
};

// TODO: accept Partial changes and return a new frozen Readonly object
function updateSettings(current: UserSettings, changes: UserSettings): UserSettings {
  return current;
}

// TODO: accept Partial settings and return Required settings, using ?? for each field
function resolveSettings(settings: UserSettings): UserSettings {
  return settings;
}
