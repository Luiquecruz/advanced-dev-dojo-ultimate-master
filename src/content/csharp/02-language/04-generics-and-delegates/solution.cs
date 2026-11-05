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
        for (var index = 0; index < _items.Count; index++)
        {
            if (_items[index].Id == item.Id)
            {
                _items[index] = item;
                return;
            }
        }
        _items.Add(item);
    }

    public T? Find(int id)
    {
        foreach (var item in _items)
        {
            if (item.Id == id)
            {
                return item;
            }
        }
        return null;
    }

    public List<T> Filter(Func<T, bool> predicate)
    {
        var matches = new List<T>();
        foreach (var item in _items)
        {
            if (predicate(item))
            {
                matches.Add(item);
            }
        }
        return matches;
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
        var wasAtOrAbove = Stock >= _threshold;
        Stock -= quantity;
        if (wasAtOrAbove && Stock < _threshold)
        {
            LowStock?.Invoke(this, new LowStockEventArgs(Stock));
        }
    }
}

public static class Callbacks
{
    public static List<Func<int>> Numbered(int count)
    {
        var callbacks = new List<Func<int>>();
        for (var i = 0; i < count; i++)
        {
            var index = i;
            callbacks.Add(() => index);
        }
        return callbacks;
    }
}
