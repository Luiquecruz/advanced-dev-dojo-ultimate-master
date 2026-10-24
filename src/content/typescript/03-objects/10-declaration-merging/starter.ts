interface PluginRegistry {
  analytics: {
    trackedEvents: string[];
    trackEvent(name: string): void;
  };
}

// TODO: declare PluginRegistry again and add featureFlags: { isEnabled(flag: string): boolean }

function createRegistry(enabledFlags: string[]): PluginRegistry {
  const trackedEvents: string[] = [];
  return {
    analytics: {
      trackedEvents,
      trackEvent(name) {
        trackedEvents.push(name);
      },
    },
    // TODO: add featureFlags
  };
}
