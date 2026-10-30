export function createShell(container) {
  const registrations = new Map();

  // TODO: listen to the 'mfe:navigate' CustomEvent on window and call navigate(event.detail.path)

  return {
    register(name, registration) {
      registrations.set(name, registration);
    },
    async navigate(path) {
      // TODO: call the unmount returned by the current micro-frontend and empty the container
      // TODO: find the registration whose route equals path or prefixes it (route + '/')
      // TODO: append a <section data-micro-frontend="<name>"> to the container
      // TODO: call load() only once per micro-frontend (cache the promise), then mount(element, { path }) and keep the returned unmount
      // TODO: if load or mount fails, show <p role="alert">Failed to load <name></p> inside the section instead of throwing
    },
    destroy() {
      // TODO: stop listening to 'mfe:navigate' and unmount the current micro-frontend
    },
  };
}
