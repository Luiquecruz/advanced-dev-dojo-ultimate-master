function* range(start: number, end: number, step = 1): Generator<number, void, undefined> {
  for (let value = start; value < end; value += step) {
    yield value;
  }
}

function* chunk<T>(items: Iterable<T>, size: number): Generator<T[], void, undefined> {
  let current: T[] = [];
  for (const item of items) {
    current.push(item);
    if (current.length === size) {
      yield current;
      current = [];
    }
  }
  if (current.length > 0) {
    yield current;
  }
}

class Playlist implements Iterable<string> {
  #songs: string[] = [];

  add(song: string): this {
    this.#songs.push(song);
    return this;
  }

  *[Symbol.iterator](): Generator<string, void, undefined> {
    yield* this.#songs;
  }
}
