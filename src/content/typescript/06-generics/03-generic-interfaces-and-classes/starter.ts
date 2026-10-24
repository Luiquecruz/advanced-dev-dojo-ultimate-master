// TODO: declare interface Page<T> with items, page and total

// TODO: make Repository generic with a { id: number } constraint
class Repository {
  #items = new Map<number, unknown>();

  add(item: unknown): void {
    // TODO: store the item by its id
  }

  findById(id: number): unknown {
    return this.#items.get(id);
  }

  all(): readonly unknown[] {
    return [...this.#items.values()];
  }

  // TODO: add where(predicate) and paginate(page, size)
}
