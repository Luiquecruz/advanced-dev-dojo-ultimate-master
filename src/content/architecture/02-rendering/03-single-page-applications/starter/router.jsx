export function usePathname() {
  // TODO: subscribe to "popstate" and to your own navigation event with useSyncExternalStore
  return window.location.pathname;
}

export function navigate(path) {
  // TODO: push the path with window.history.pushState and notify subscribers
}

export function Link({ to, children, ...rest }) {
  // TODO: intercept plain left clicks with preventDefault and navigate(to); let modified clicks through
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}
