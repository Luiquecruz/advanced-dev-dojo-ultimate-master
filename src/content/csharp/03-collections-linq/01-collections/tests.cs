using Dojo;

public static class InventoryTests
{
    [Test("Receive adds to one entry per SKU, whatever its case")]
    public static void ReceiveIgnoresCase()
    {
        var inventory = new Inventory();
        inventory.Receive("A-1", 5);
        inventory.Receive("a-1", 3);

        Assert.Equal(8, inventory.StockOf("A-1"));
        Assert.Equal(1, inventory.Snapshot().Count);
    }

    // beginner mistake: reading an unknown key with the indexer throws KeyNotFoundException
    [Test("StockOf an unknown SKU is 0 instead of an exception")]
    public static void StockOfUnknownSku()
    {
        var inventory = new Inventory();
        inventory.Receive("A-1", 5);

        Assert.Equal(0, inventory.StockOf("Z-9"));
    }

    [Test("TryTake removes stock only when there is enough")]
    public static void TryTakeNeverGoesNegative()
    {
        var inventory = new Inventory();
        inventory.Receive("A-1", 5);

        Assert.True(inventory.TryTake("a-1", 3), "taking 3 of 5 should succeed");
        Assert.Equal(2, inventory.StockOf("A-1"));
        Assert.False(inventory.TryTake("A-1", 3), "taking 3 of 2 should fail");
        Assert.Equal(2, inventory.StockOf("A-1"));
    }

    [Test("TryTake of an unknown SKU returns false and adds nothing")]
    public static void TryTakeUnknownSku()
    {
        var inventory = new Inventory();
        inventory.Receive("A-1", 5);

        Assert.False(inventory.TryTake("Z-9", 1));
        Assert.Equal(1, inventory.Snapshot().Count);
    }

    [Test("Snapshot is a copy that later changes do not affect")]
    public static void SnapshotIsACopy()
    {
        var inventory = new Inventory();
        inventory.Receive("A-1", 5);

        var snapshot = inventory.Snapshot();
        inventory.Receive("A-1", 10);
        inventory.Receive("B-2", 1);

        Assert.Equal(5, snapshot["A-1"]);
        Assert.False(snapshot.ContainsKey("B-2"), "the snapshot must not gain SKUs received after it was taken");
    }

    [Test("Duplicates reports each repeated SKU, ignoring case, in the order the repeats occur")]
    public static void DuplicatesIgnoreCase()
    {
        Assert.SequenceEqual(["a-1", "B-2"], Skus.Duplicates(["A-1", "B-2", "a-1", "B-2", "C-3"]));
        Assert.SequenceEqual([], Skus.Duplicates(["A-1", "B-2"]));
    }
}
