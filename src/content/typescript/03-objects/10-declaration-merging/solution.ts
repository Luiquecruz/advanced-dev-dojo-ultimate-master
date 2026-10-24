interface PluginRegistry {
  analytics: {
    trackedEvents: string[];
    trackEvent(name: string): void;
  };
}

interface PluginRegistry {
  featureFlags: {
    isEnabled(flag: string): boolean;
  };
}

function createRegistry(enabledFlags: string[]): PluginRegistry {
  const trackedEvents: string[] = [];
  return {
    analytics: {
      trackedEvents,
      trackEvent(name) {
        trackedEvents.push(name);
      },
    },
    featureFlags: {
      isEnabled(flag) {
        return enabledFlags.includes(flag);
      },
    },
  };
}
