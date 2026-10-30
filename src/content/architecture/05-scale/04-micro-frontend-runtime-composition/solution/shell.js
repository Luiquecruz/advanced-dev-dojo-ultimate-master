export function createShell(container) {
  const registrations = new Map();
  const loadedMicroFrontends = new Map();
  let mounted = null;
  let latestNavigation = 0;

  function findRegistration(path) {
    for (const [name, registration] of registrations) {
      if (path === registration.route || path.startsWith(`${registration.route}/`)) {
        return { name, ...registration };
      }
    }
    return null;
  }

  function loadOnce(registration) {
    if (!loadedMicroFrontends.has(registration.name)) {
      const loading = Promise.resolve()
        .then(registration.load)
        .catch((error) => {
          loadedMicroFrontends.delete(registration.name);
          throw error;
        });
      loadedMicroFrontends.set(registration.name, loading);
    }
    return loadedMicroFrontends.get(registration.name);
  }

  function unmountCurrent() {
    const previous = mounted;
    mounted = null;
    previous?.unmount?.();
    container.replaceChildren();
  }

  function showMessage(element, text) {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = text;
    element.replaceChildren(message);
  }

  async function navigate(path) {
    const navigation = ++latestNavigation;
    unmountCurrent();
    const registration = findRegistration(path);
    if (!registration) {
      showMessage(container, `No micro-frontend for ${path}`);
      return;
    }

    const element = document.createElement('section');
    element.dataset.microFrontend = registration.name;
    container.append(element);

    try {
      const microFrontend = await loadOnce(registration);
      if (navigation !== latestNavigation) return;
      mounted = { unmount: microFrontend.mount(element, { path }) };
    } catch {
      if (navigation !== latestNavigation) return;
      showMessage(element, `Failed to load ${registration.name}`);
    }
  }

  function handleNavigationRequest(event) {
    navigate(event.detail.path);
  }

  window.addEventListener('mfe:navigate', handleNavigationRequest);

  return {
    register(name, registration) {
      registrations.set(name, registration);
    },
    navigate,
    destroy() {
      window.removeEventListener('mfe:navigate', handleNavigationRequest);
      latestNavigation++;
      unmountCurrent();
    },
  };
}
