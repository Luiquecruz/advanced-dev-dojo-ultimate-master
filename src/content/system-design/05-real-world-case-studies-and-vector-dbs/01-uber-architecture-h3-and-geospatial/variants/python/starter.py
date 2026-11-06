import math


class GridIndex:
    def __init__(self, cell_size_degrees):
        self._cell_size = cell_size_degrees
        self._cells = {}

    def cell_of(self, lat, lon):
        # TODO: floor both coordinates divided by the cell size
        return f"{round(lat / self._cell_size)}:{round(lon / self._cell_size)}"

    def upsert(self, driver_id, lat, lon):
        # TODO: remember each driver's current cell and remove the driver from it before adding to the new cell
        self._cells.setdefault(self.cell_of(lat, lon), set()).add(driver_id)

    def remove(self, driver_id):
        # TODO: remove the driver from its cell and report whether it was indexed
        return False

    def count_in(self, cell_id):
        return len(self._cells.get(cell_id, ()))

    def nearby(self, lat, lon, rings):
        # TODO: read every cell from row - rings to row + rings and col - rings to col + rings
        return sorted(self._cells.get(self.cell_of(lat, lon), ()))


if __name__ == "__main__":
    index = GridIndex(cell_size_degrees=1)
    index.upsert("driver-a", 10.5, 20.5)
    index.upsert("driver-b", 11.5, 21.5)
    print(index.cell_of(10.5, 20.5))
    print(index.nearby(10.5, 20.5, rings=1))
