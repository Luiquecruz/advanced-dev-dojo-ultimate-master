// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
VectorItem[] items =
[
    new("cats", [0.9, 0.1, 0]),
    new("dogs", [0.7, 0.3, 0]),
    new("taxes", [0, 0.1, 0.9]),
];
Console.WriteLine(string.Join(", ", VectorSearch.ExactSearch(items, [1, 0, 0], k: 2)));

public record VectorItem(string Id, double[] Vector);

public static class VectorSearch
{
    public static double CosineSimilarity(double[] a, double[] b)
    {
        // TODO: divide by the product of both lengths, and return 0 when either length is zero
        return Dot(a, b);
    }

    public static IReadOnlyList<string> ExactSearch(IEnumerable<VectorItem> items, double[] query, int k)
    {
        // TODO: break ties between equal similarities by id ascending
        return items
            .Select(item => (item.Id, Score: CosineSimilarity(item.Vector, query)))
            .OrderByDescending(entry => entry.Score)
            .Take(k)
            .Select(entry => entry.Id)
            .ToList();
    }

    private static double Dot(double[] a, double[] b) => a.Zip(b, (x, y) => x * y).Sum();
}

public class IvfIndex
{
    private readonly double[][] _centroids;
    private readonly List<VectorItem>[] _lists;

    public IvfIndex(double[][] centroids)
    {
        _centroids = centroids;
        _lists = centroids.Select(_ => new List<VectorItem>()).ToArray();
    }

    public void Add(string id, double[] vector)
    {
        // TODO: store the vector in the list of its most similar centroid
        _lists[0].Add(new VectorItem(id, vector));
    }

    public IReadOnlyList<int> ListSizes() => _lists.Select(list => list.Count).ToList();

    public IReadOnlyList<string> Search(double[] query, int k, int nprobe)
    {
        // TODO: rank the centroids by similarity to the query and search only the first nprobe lists
        return VectorSearch.ExactSearch(_lists.SelectMany(list => list), query, k);
    }
}
