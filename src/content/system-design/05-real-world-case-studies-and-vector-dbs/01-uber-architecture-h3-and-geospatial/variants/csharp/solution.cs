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
    private readonly Dictionary<string, string> _cellOfDriver = new();

    public GridIndex(double cellSizeDegrees)
    {
        _cellSizeDegrees = cellSizeDegrees;
    }

    public string CellOf(double lat, double lon) => Key(RowOf(lat), ColOf(lon));

    public void Upsert(string driverId, double lat, double lon)
    {
        LeaveCell(driverId);
        var cellId = CellOf(lat, lon);
        if (!_cells.TryGetValue(cellId, out var drivers))
        {
            drivers = [];
            _cells[cellId] = drivers;
        }
        drivers.Add(driverId);
        _cellOfDriver[driverId] = cellId;
    }

    public bool Remove(string driverId) => LeaveCell(driverId);

    public int CountIn(string cellId) => _cells.TryGetValue(cellId, out var drivers) ? drivers.Count : 0;

    public IReadOnlyList<string> Nearby(double lat, double lon, int rings)
    {
        var row = RowOf(lat);
        var col = ColOf(lon);
        var found = new List<string>();
        for (var r = row - rings; r <= row + rings; r++)
        {
            for (var c = col - rings; c <= col + rings; c++)
            {
                if (_cells.TryGetValue(Key(r, c), out var drivers))
                {
                    found.AddRange(drivers);
                }
            }
        }
        found.Sort(StringComparer.Ordinal);
        return found;
    }

    private long RowOf(double lat) => (long)Math.Floor(lat / _cellSizeDegrees);

    private long ColOf(double lon) => (long)Math.Floor(lon / _cellSizeDegrees);

    private static string Key(long row, long col) => string.Create(CultureInfo.InvariantCulture, $"{row}:{col}");

    private bool LeaveCell(string driverId)
    {
        if (!_cellOfDriver.Remove(driverId, out var previous))
        {
            return false;
        }
        var drivers = _cells[previous];
        drivers.Remove(driverId);
        if (drivers.Count == 0)
        {
            _cells.Remove(previous);
        }
        return true;
    }
}
