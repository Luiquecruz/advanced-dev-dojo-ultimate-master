export interface GridIndexOptions {
  cellSizeDegrees: number;
}

export interface GridIndex {
  cellOf(lat: number, lon: number): string;
  upsert(driverId: string, lat: number, lon: number): void;
  remove(driverId: string): boolean;
  countIn(cellId: string): number;
  nearby(lat: number, lon: number, rings: number): string[];
}

export function createGridIndex(options: GridIndexOptions): GridIndex {
  const { cellSizeDegrees } = options;
  const cells = new Map<string, Set<string>>();
  const cellOfDriver = new Map<string, string>();

  const rowOf = (lat: number) => Math.floor(lat / cellSizeDegrees);
  const colOf = (lon: number) => Math.floor(lon / cellSizeDegrees);
  const key = (row: number, col: number) => `${row}:${col}`;

  function cellOf(lat: number, lon: number): string {
    return key(rowOf(lat), colOf(lon));
  }

  function leaveCell(driverId: string): boolean {
    const previous = cellOfDriver.get(driverId);
    if (previous === undefined) {
      return false;
    }
    const drivers = cells.get(previous)!;
    drivers.delete(driverId);
    if (drivers.size === 0) {
      cells.delete(previous);
    }
    cellOfDriver.delete(driverId);
    return true;
  }

  function upsert(driverId: string, lat: number, lon: number): void {
    leaveCell(driverId);
    const cellId = cellOf(lat, lon);
    const drivers = cells.get(cellId) ?? new Set<string>();
    drivers.add(driverId);
    cells.set(cellId, drivers);
    cellOfDriver.set(driverId, cellId);
  }

  function remove(driverId: string): boolean {
    return leaveCell(driverId);
  }

  function countIn(cellId: string): number {
    return cells.get(cellId)?.size ?? 0;
  }

  function nearby(lat: number, lon: number, rings: number): string[] {
    const row = rowOf(lat);
    const col = colOf(lon);
    const found: string[] = [];
    for (let r = row - rings; r <= row + rings; r++) {
      for (let c = col - rings; c <= col + rings; c++) {
        found.push(...(cells.get(key(r, c)) ?? []));
      }
    }
    return found.sort();
  }

  return { cellOf, upsert, remove, countIn, nearby };
}

const index = createGridIndex({ cellSizeDegrees: 1 });
index.upsert('driver-a', 10.5, 20.5);
index.upsert('driver-b', 11.5, 21.5);
console.log(index.cellOf(10.5, 20.5));
console.log(index.nearby(10.5, 20.5, 1));
