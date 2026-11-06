import math


class GridIndex:
    def __init__(self, cell_size_degrees):
        self._cell_size = cell_size_degrees
        self._cells = {}
        self._cell_of_driver = {}

    def _row_col(self, lat, lon):
        return math.floor(lat / self._cell_size), math.floor(lon / self._cell_size)

    def cell_of(self, lat, lon):
        row, col = self._row_col(lat, lon)
        return f"{row}:{col}"

    def _leave_cell(self, driver_id):
        previous = self._cell_of_driver.pop(driver_id, None)
        if previous is None:
            return False
        drivers = self._cells[previous]
        drivers.discard(driver_id)
        if not drivers:
            del self._cells[previous]
        return True

    def upsert(self, driver_id, lat, lon):
        self._leave_cell(driver_id)
        cell_id = self.cell_of(lat, lon)
        self._cells.setdefault(cell_id, set()).add(driver_id)
        self._cell_of_driver[driver_id] = cell_id

    def remove(self, driver_id):
        return self._leave_cell(driver_id)

    def count_in(self, cell_id):
        return len(self._cells.get(cell_id, ()))

    def nearby(self, lat, lon, rings):
        row, col = self._row_col(lat, lon)
        found = []
        for r in range(row - rings, row + rings + 1):
            for c in range(col - rings, col + rings + 1):
                found.extend(self._cells.get(f"{r}:{c}", ()))
        return sorted(found)


if __name__ == "__main__":
    index = GridIndex(cell_size_degrees=1)
    index.upsert("driver-a", 10.5, 20.5)
    index.upsert("driver-b", 11.5, 21.5)
    print(index.cell_of(10.5, 20.5))
    print(index.nearby(10.5, 20.5, rings=1))
