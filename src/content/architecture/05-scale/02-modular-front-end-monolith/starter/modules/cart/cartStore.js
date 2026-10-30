export function createCartStore() {
  let lines = [];
  const listeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLines() {
      return lines;
    },
    add(product) {
      const existing = lines.find((line) => line.id === product.id);
      lines = existing
        ? lines.map((line) => (line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...lines, { ...product, quantity: 1 }];
      listeners.forEach((listener) => listener());
    },
  };
}

export const cartStore = createCartStore();
