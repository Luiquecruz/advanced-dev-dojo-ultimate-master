function* range(start: number, end: number, step = 1): Generator<number, void, undefined> {
  // TODO: yield start, start + step, ... while the value is less than end
}

function* chunk<T>(items: Iterable<T>, size: number): Generator<T[], void, undefined> {
  // TODO: collect items into arrays of `size` and yield each one, plus the shorter remainder
}

class Playlist {
  #songs: string[] = [];

  add(song: string): this {
    this.#songs.push(song);
    return this;
  }

  // TODO: implement Iterable<string> with a [Symbol.iterator] generator method
}
