using Dojo;

public static class GridIndexTests
{
    [Test("the cell id floors latitude and longitude divided by the cell size, also for negative coordinates")]
    public static void FloorsCoordinates()
    {
        var index = new GridIndex(cellSizeDegrees: 0.5);
        Assert.Equal("20:41", index.CellOf(10.2, 20.7));
        Assert.Equal("0:0", index.CellOf(0.1, 0.1));
        Assert.Equal("-1:-1", index.CellOf(-0.1, -0.1));
        Assert.Equal("-22:60", index.CellOf(-10.6, 30.25));
    }

    [Test("nearby reads the cell alone for 0 rings and the 3 x 3 block for 1 ring, sorted")]
    public static void ReadsTheRingsAroundTheCell()
    {
        var index = new GridIndex(cellSizeDegrees: 1);
        index.Upsert("center", 10.5, 20.5);
        index.Upsert("north", 11.5, 20.5);
        index.Upsert("diagonal", 9.5, 19.5);
        index.Upsert("far", 12.5, 20.5);
        index.Upsert("also-center", 10.9, 20.1);
        Assert.SequenceEqual(["also-center", "center"], index.Nearby(10.5, 20.5, rings: 0));
        Assert.SequenceEqual(["also-center", "center", "diagonal", "north"], index.Nearby(10.5, 20.5, rings: 1));
        Assert.SequenceEqual(["also-center", "center", "diagonal", "far", "north"], index.Nearby(10.5, 20.5, rings: 2));
    }

    // beginner mistake: adding a driver to the new cell without removing them from the old one
    [Test("a driver who moves is found only in the new cell and the old cell loses its supply")]
    public static void MovesADriverBetweenCells()
    {
        var index = new GridIndex(cellSizeDegrees: 1);
        index.Upsert("driver-a", 10.5, 20.5);
        index.Upsert("driver-b", 10.5, 20.5);
        index.Upsert("driver-a", 40.5, 50.5);
        Assert.SequenceEqual(["driver-b"], index.Nearby(10.5, 20.5, rings: 0));
        Assert.SequenceEqual(["driver-a"], index.Nearby(40.5, 50.5, rings: 0));
        Assert.Equal(1, index.CountIn("10:20"));
        Assert.Equal(1, index.CountIn("40:50"));
        index.Upsert("driver-a", 40.6, 50.6);
        Assert.SequenceEqual(["driver-a"], index.Nearby(40.5, 50.5, rings: 1));
    }

    [Test("remove takes a driver out of the index and returns false for an unknown driver")]
    public static void RemovesADriver()
    {
        var index = new GridIndex(cellSizeDegrees: 1);
        index.Upsert("driver-a", 10.5, 20.5);
        Assert.True(index.Remove("driver-a"));
        Assert.False(index.Remove("driver-a"));
        Assert.False(index.Remove("ghost"));
        Assert.SequenceEqual([], index.Nearby(10.5, 20.5, rings: 1));
        Assert.Equal(0, index.CountIn("10:20"));
    }
}
