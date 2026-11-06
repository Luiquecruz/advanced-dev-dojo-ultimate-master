export type Entry = [key: string, value: string | null];

export interface LsmStore {
  put(key: string, value: string): void;
  delete(key: string): void;
  get(key: string): string | undefined;
  sstableCount(): number;
  sstables(): Entry[][];
  compact(): void;
}

const byKey = (left: Entry, right: Entry) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0);

function findEntry(table: Entry[], key: string): Entry | undefined {
  let low = 0;
  let high = table.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const current = table[middle][0];
    if (current === key) {
      return table[middle];
    }
    if (current < key) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return undefined;
}

export function createLsmStore(options: { memtableLimit: number }): LsmStore {
  let memtable = new Map<string, string | null>();
  let tables: Entry[][] = [];

  function write(key: string, value: string | null): void {
    memtable.set(key, value);
    if (memtable.size < options.memtableLimit) {
      return;
    }
    tables.push([...memtable.entries()].sort(byKey));
    memtable = new Map();
  }

  function get(key: string): string | undefined {
    if (memtable.has(key)) {
      return memtable.get(key) ?? undefined;
    }
    for (let index = tables.length - 1; index >= 0; index--) {
      const entry = findEntry(tables[index], key);
      if (entry) {
        return entry[1] ?? undefined;
      }
    }
    return undefined;
  }

  function compact(): void {
    const newest = new Map<string, string | null>();
    for (const table of tables) {
      for (const [key, value] of table) {
        newest.set(key, value);
      }
    }
    const merged = [...newest.entries()].filter((entry): entry is [string, string] => entry[1] !== null).sort(byKey);
    tables = merged.length === 0 ? [] : [merged];
  }

  return {
    put: (key, value) => write(key, value),
    delete: (key) => write(key, null),
    get,
    sstableCount: () => tables.length,
    sstables: () => tables.map((table) => table.map(([key, value]) => [key, value] as Entry)),
    compact,
  };
}

const store = createLsmStore({ memtableLimit: 2 });
store.put('user:2', 'Alan');
store.put('user:1', 'Ada');
store.delete('user:2');
console.log(store.sstables(), store.get('user:1'), store.get('user:2'));
