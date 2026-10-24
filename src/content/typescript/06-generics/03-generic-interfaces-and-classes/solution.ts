interface Page<T> {
  items: T[];
  page: number;
  total: number;
}

class Repository<T extends { id: number }> {
  #items = new Map<number, T>();

  add(item: T): void {
    this.#items.set(item.id, item);
  }

  findById(id: number): T | undefined {
    return this.#items.get(id);
  }

  all(): readonly T[] {
    return [...this.#items.values()];
  }

  where(predicate: (item: T) => boolean): T[] {
    return [...this.#items.values()].filter(predicate);
  }

  paginate(page: number, size: number): Page<T> {
    const items = [...this.#items.values()];
    const start = (page - 1) * size;
    return { items: items.slice(start, start + size), page, total: items.length };
  }
}
