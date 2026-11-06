using Dojo;

public static class VectorSearchTests
{
    [Test("cosine similarity measures direction only and returns 0 for a zero-length vector")]
    public static void MeasuresDirectionOnly()
    {
        Assert.Equal(1, VectorSearch.CosineSimilarity([1, 0], [1, 0]), 1e-6);
        Assert.Equal(0, VectorSearch.CosineSimilarity([1, 0], [0, 3]), 1e-6);
        Assert.Equal(-1, VectorSearch.CosineSimilarity([1, 2], [-2, -4]), 1e-6);
        Assert.Equal(1, VectorSearch.CosineSimilarity([1, 2], [3, 6]), 1e-6);
        Assert.Equal(0.96, VectorSearch.CosineSimilarity([3, 4], [4, 3]), 1e-6);
        Assert.Equal(0, VectorSearch.CosineSimilarity([0, 0], [1, 1]));
    }

    // beginner mistake: ranking by a raw dot product, so a long vector outranks one in the query's exact direction
    [Test("exact search ranks by direction, not by vector length")]
    public static void RanksByDirection()
    {
        VectorItem[] items = [new("long-but-off", [10, 10]), new("short-and-exact", [1, 0])];
        Assert.SequenceEqual(["short-and-exact", "long-but-off"], VectorSearch.ExactSearch(items, [1, 0], k: 2));
        Assert.SequenceEqual(["short-and-exact"], VectorSearch.ExactSearch(items, [2, 0], k: 1));
    }

    [Test("exact search returns the top k, breaks ties by id and returns every id when k is large")]
    public static void ReturnsTheTopKWithTiesById()
    {
        VectorItem[] items = [new("b", [1, 0]), new("d", [-1, 0]), new("a", [2, 0]), new("c", [0, 1])];
        Assert.SequenceEqual(["a", "b"], VectorSearch.ExactSearch(items, [1, 0], k: 2));
        Assert.SequenceEqual(["a", "b", "c", "d"], VectorSearch.ExactSearch(items, [1, 0], k: 10));
    }

    [Test("the IVF index stores each vector in the list of its most similar centroid, the lowest index on a tie")]
    public static void StoresEachVectorUnderItsNearestCentroid()
    {
        var index = new IvfIndex([[1, 0], [0, 1], [-1, 0]]);
        index.Add("east", [5, 1]);
        index.Add("north", [0.2, 3]);
        index.Add("west", [-2, -0.5]);
        index.Add("north-east", [0.6, 0.8]);
        index.Add("also-east", [1, 0.2]);
        Assert.SequenceEqual([2, 2, 1], index.ListSizes());
        index.Add("diagonal", [1, 1]);
        Assert.SequenceEqual([3, 2, 1], index.ListSizes());
    }

    [Test("IVF search only probes the nprobe nearest lists and matches exact search when it probes them all")]
    public static void ProbesOnlyTheNearestLists()
    {
        var index = new IvfIndex([[1, 0], [0, 1]]);
        index.Add("x", [1, 0.1]);
        index.Add("y", [0.6, 0.8]);
        index.Add("z", [0, 1]);
        Assert.SequenceEqual(["x"], index.Search([0.8, 0.6], k: 2, nprobe: 1));
        Assert.SequenceEqual(["y", "x"], index.Search([0.8, 0.6], k: 2, nprobe: 2));
        Assert.SequenceEqual(["y", "x", "z"], index.Search([0.8, 0.6], k: 3, nprobe: 2));
    }
}
