using System.Globalization;

// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var index = new GridIndex(cellSizeDegrees: 1);
index.Upsert("driver-a", 10.5, 20.5);
index.Upsert("driver-b", 11.5, 21.5);
Console.WriteLine(index.CellOf(10.5, 20.5));
Console.WriteLine(string.Join(", ", index.Nearby(10.5, 20.5, rings: 1)));

public class GridIndex
{
    private readonly double _cellSizeDegrees;
    private readonly Dictionary<string, HashSet<string>> _cells = new();

    public GridIndex(double cellSizeDegrees)
    {
        _cellSizeDegrees = cellSizeDegrees;
    }

    public string CellOf(double lat, double lon)
    {
        // TODO: floor both coordinates divided by the cell size
        var row = (long)Math.Round(lat / _cellSizeDegrees);
        var col = (long)Math.Round(lon / _cellSizeDegrees);
        return string.Create(CultureInfo.InvariantCulture, $"{row}:{col}");
    }

    public void Upsert(string driverId, double lat, double lon)
    {
        // TODO: remember each driver's current cell and remove the driver from it before adding to the new cell
        var cellId = CellOf(lat, lon);
        if (!_cells.TryGetValue(cellId, out var drivers))
        {
            drivers = [];
            _cells[cellId] = drivers;
        }
        drivers.Add(driverId);
    }

    public bool Remove(string driverId)
    {
        // TODO: remove the driver from its cell and report whether it was indexed
        return false;
    }

    public int CountIn(string cellId) => _cells.TryGetValue(cellId, out var drivers) ? drivers.Count : 0;

    public IReadOnlyList<string> Nearby(double lat, double lon, int rings)
    {
        // TODO: read every cell from row - rings to row + rings and col - rings to col + rings
        return _cells.TryGetValue(CellOf(lat, lon), out var drivers) ? drivers.Order(StringComparer.Ordinal).ToList() : [];
    }
}
