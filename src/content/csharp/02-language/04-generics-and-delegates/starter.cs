public interface IHasId
{
    int Id { get; }
}

public sealed class Repository<T> where T : class, IHasId
{
    private readonly List<T> _items = [];

    public int Count => _items.Count;

    public void Add(T item)
    {
        // TODO: replace the stored item that has the same Id, or add the item at the end.
        _items.Add(item);
    }

    public T? Find(int id)
    {
        // TODO: the item with this Id, or null.
        return null;
    }

    public List<T> Filter(Func<T, bool> predicate)
    {
        // TODO: the items the predicate accepts, in the order they were added. Use a loop, not LINQ.
        return [];
    }
}

public sealed class LowStockEventArgs : EventArgs
{
    public LowStockEventArgs(int stock) => Stock = stock;

    public int Stock { get; }
}

public sealed class StockCounter
{
    private readonly int _threshold;

    public StockCounter(int initialStock, int threshold)
    {
        Stock = initialStock;
        _threshold = threshold;
    }

    public int Stock { get; private set; }

    public event EventHandler<LowStockEventArgs>? LowStock;

    public void Remove(int quantity)
    {
        // TODO: raise LowStock when this removal takes the stock from the threshold or above to below it.
        Stock -= quantity;
    }
}

public static class Callbacks
{
    public static List<Func<int>> Numbered(int count)
    {
        var callbacks = new List<Func<int>>();
        for (var i = 0; i < count; i++)
        {
            // TODO: each callback must return its own index.
            callbacks.Add(() => i);
        }
        return callbacks;
    }
}
