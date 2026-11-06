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

  function cellOf(lat: number, lon: number): string {
    // TODO: floor both coordinates divided by the cell size
    return `${Math.round(lat / cellSizeDegrees)}:${Math.round(lon / cellSizeDegrees)}`;
  }

  function upsert(driverId: string, lat: number, lon: number): void {
    // TODO: remember each driver's current cell and remove the driver from it before adding to the new cell
    const cellId = cellOf(lat, lon);
    const drivers = cells.get(cellId) ?? new Set<string>();
    drivers.add(driverId);
    cells.set(cellId, drivers);
  }

  function remove(driverId: string): boolean {
    // TODO: remove the driver from its cell and report whether it was indexed
    return false;
  }

  function countIn(cellId: string): number {
    return cells.get(cellId)?.size ?? 0;
  }

  function nearby(lat: number, lon: number, rings: number): string[] {
    // TODO: read every cell from row - rings to row + rings and col - rings to col + rings
    return [...(cells.get(cellOf(lat, lon)) ?? [])].sort();
  }

  return { cellOf, upsert, remove, countIn, nearby };
}

const index = createGridIndex({ cellSizeDegrees: 1 });
index.upsert('driver-a', 10.5, 20.5);
index.upsert('driver-b', 11.5, 21.5);
console.log(index.cellOf(10.5, 20.5));
console.log(index.nearby(10.5, 20.5, 1));
