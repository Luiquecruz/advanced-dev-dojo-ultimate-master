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
        var lengths = Norm(a) * Norm(b);
        return lengths == 0 ? 0 : Dot(a, b) / lengths;
    }

    public static IReadOnlyList<string> ExactSearch(IEnumerable<VectorItem> items, double[] query, int k) =>
        items
            .Select(item => (item.Id, Score: CosineSimilarity(item.Vector, query)))
            .OrderByDescending(entry => entry.Score)
            .ThenBy(entry => entry.Id, StringComparer.Ordinal)
            .Take(k)
            .Select(entry => entry.Id)
            .ToList();

    private static double Dot(double[] a, double[] b) => a.Zip(b, (x, y) => x * y).Sum();

    private static double Norm(double[] a) => Math.Sqrt(Dot(a, a));
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

    public void Add(string id, double[] vector) => _lists[RankCentroids(vector)[0]].Add(new VectorItem(id, vector));

    public IReadOnlyList<int> ListSizes() => _lists.Select(list => list.Count).ToList();

    public IReadOnlyList<string> Search(double[] query, int k, int nprobe)
    {
        var probed = RankCentroids(query).Take(nprobe);
        return VectorSearch.ExactSearch(probed.SelectMany(index => _lists[index]), query, k);
    }

    private List<int> RankCentroids(double[] vector) =>
        _centroids
            .Select((centroid, index) => (Index: index, Score: VectorSearch.CosineSimilarity(centroid, vector)))
            .OrderByDescending(entry => entry.Score)
            .ThenBy(entry => entry.Index)
            .Select(entry => entry.Index)
            .ToList();
}
