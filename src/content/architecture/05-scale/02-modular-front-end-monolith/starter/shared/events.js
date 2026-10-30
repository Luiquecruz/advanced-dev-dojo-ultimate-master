export function createEventBus() {
  const handlersByType = new Map();

  return {
    on(type, handler) {
      const handlers = handlersByType.get(type) ?? new Set();
      handlers.add(handler);
      handlersByType.set(type, handlers);
      return () => handlers.delete(handler);
    },
    emit(type, payload) {
      handlersByType.get(type)?.forEach((handler) => handler(payload));
    },
  };
}
