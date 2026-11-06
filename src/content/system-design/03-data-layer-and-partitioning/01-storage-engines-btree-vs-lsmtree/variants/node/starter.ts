export type Entry = [key: string, value: string | null];

export interface LsmStore {
  put(key: string, value: string): void;
  delete(key: string): void;
  get(key: string): string | undefined;
  sstableCount(): number;
  sstables(): Entry[][];
  compact(): void;
}

export function createLsmStore(options: { memtableLimit: number }): LsmStore {
  let memtable = new Map<string, string | null>();
  let tables: Entry[][] = [];

  function flushIfFull(): void {
    // TODO: when the MemTable holds memtableLimit keys, append it as a sorted SSTable and start a new MemTable
  }

  return {
    put(key, value) {
      memtable.set(key, value);
      flushIfFull();
    },
    delete(key) {
      // TODO: write a tombstone instead of forgetting the key
      memtable.delete(key);
    },
    get(key) {
      const value = memtable.get(key);
      if (value !== undefined && value !== null) {
        return value;
      }
      // TODO: search the SSTables from newest to oldest and stop at the first entry, tombstones included
      return undefined;
    },
    sstableCount() {
      return tables.length;
    },
    sstables() {
      return tables;
    },
    compact() {
      // TODO: merge every SSTable into one, newest entry per key, without tombstones
    },
  };
}

const store = createLsmStore({ memtableLimit: 2 });
store.put('user:2', 'Alan');
store.put('user:1', 'Ada');
store.delete('user:2');
console.log(store.sstables(), store.get('user:1'), store.get('user:2'));
