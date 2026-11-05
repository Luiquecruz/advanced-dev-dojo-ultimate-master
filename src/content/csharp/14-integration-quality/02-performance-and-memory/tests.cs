using System.Buffers;
using System.IO;
using Dojo;

/// <summary>A pool that hands out arrays larger than asked for, pre-filled with 0xFF, and counts every rent and return.</summary>
public sealed class CountingPool : ArrayPool<byte>
{
    public int Rents { get; private set; }
    public int Returns { get; private set; }
    public byte[]? LastRented { get; private set; }
    public int LastMinimumLength { get; private set; }
    public bool ReturnedTheRentedArray { get; private set; }

    public override byte[] Rent(int minimumLength)
    {
        Rents++;
        LastMinimumLength = minimumLength;
        var array = new byte[minimumLength + 100];
        Array.Fill(array, (byte)0xFF);
        LastRented = array;
        return array;
    }

    public override void Return(byte[] array, bool clearArray = false)
    {
        Returns++;
        ReturnedTheRentedArray = ReferenceEquals(array, LastRented);
    }
}

/// <summary>A stream that returns its first chunk and then fails, like a network connection that drops.</summary>
public sealed class FailingStream : Stream
{
    private bool _sentFirstChunk;

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

    public override int Read(byte[] buffer, int offset, int count)
    {
        if (_sentFirstChunk)
        {
            throw new IOException("The connection was reset.");
        }
        _sentFirstChunk = true;
        buffer[offset] = 7;
        return 1;
    }

    public override void Flush() { }
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}

public static class PerformanceAndMemoryTests
{
    private static byte[] Data(int length)
    {
        var data = new byte[length];
        for (int i = 0; i < length; i++)
        {
            data[i] = (byte)(i % 251);
        }
        return data;
    }

    private static long SumOf(byte[] data)
    {
        long sum = 0;
        foreach (byte value in data)
        {
            sum += value;
        }
        return sum;
    }

    [Test("Parse reads a SKU and a quantity from a slice, trimming spaces, and throws FormatException for a line without a comma, with an empty SKU or with a bad number")]
    public static void ParseReadsASlice()
    {
        Assert.Equal(new StockLine("MUG-01", 12), LineParser.Parse("MUG-01,12"));
        Assert.Equal(new StockLine("BAG", 3), LineParser.Parse("  BAG , 3 "));
        Assert.Equal(new StockLine("HAT", 5), LineParser.Parse("xxHAT,5yy".AsSpan(2, 5)));
        Assert.Throws<FormatException>(() => LineParser.Parse("MUG-01;12"));
        Assert.Throws<FormatException>(() => LineParser.Parse("MUG-01,twelve"));
        Assert.Throws<FormatException>(() => LineParser.Parse(" ,5"));
    }

    [Test("SumQuantities adds up every line, skips blank lines, and accepts a trailing newline and Windows line endings")]
    public static void SumQuantitiesWalksTheLines()
    {
        Assert.Equal(15, LineParser.SumQuantities("MUG,12\nBAG,3"));
        Assert.Equal(20, LineParser.SumQuantities("MUG,12\r\n\r\nBAG,3\r\nHAT,5\r\n"));
        Assert.Equal(0, LineParser.SumQuantities(""));
        Assert.Throws<FormatException>(() => LineParser.SumQuantities("MUG,12\nbroken\n"));
    }

    [Test("Report.Build writes one \"SKU: quantity\" line per item and a final total, and only the total for no items")]
    public static void ReportListsLinesAndTotal()
    {
        Assert.Equal("MUG: 12\nBAG: 3\nTotal: 15\n", Report.Build([new StockLine("MUG", 12), new StockLine("BAG", 3)]));
        Assert.Equal("Total: 0\n", Report.Build([]));
    }

    // beginner mistake: adding up the whole rented array (its Length) instead of only the bytes Read returned
    [Test("Checksum adds up only the bytes read, although the pool hands out a larger array that already holds other data")]
    public static void ChecksumUsesOnlyTheBytesRead()
    {
        byte[] data = Data(10_000);
        long checksum = Checksum.Compute(new MemoryStream(data), new CountingPool());
        Assert.Equal(SumOf(data), checksum);
        Assert.Equal(0L, Checksum.Compute(new MemoryStream(), new CountingPool()));
    }

    [Test("Checksum rents one buffer of BufferSize bytes and returns that same buffer exactly once, also when the stream throws")]
    public static void ChecksumAlwaysReturnsTheBuffer()
    {
        var pool = new CountingPool();
        Checksum.Compute(new MemoryStream(Data(9_000)), pool);
        Assert.Equal(1, pool.Rents);
        Assert.Equal(Checksum.BufferSize, pool.LastMinimumLength);
        Assert.Equal(1, pool.Returns);
        Assert.True(pool.ReturnedTheRentedArray, "Return should receive the array that Rent handed out");

        var failing = new CountingPool();
        Assert.Throws<IOException>(() => Checksum.Compute(new FailingStream(), failing));
        Assert.Equal(1, failing.Returns);
    }
}
