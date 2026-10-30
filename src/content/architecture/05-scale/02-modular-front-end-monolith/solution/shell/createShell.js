import { createEventBus } from '../shared/events';

export function createShell() {
  const pages = [];

  return {
    events: createEventBus(),
    pages,
    addPage(page) {
      pages.push(page);
    },
  };
}
