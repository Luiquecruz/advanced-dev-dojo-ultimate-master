// Dojo.Testing.dll: the API lesson tests write against ([Test("name")] and Assert). Compiled by scripts/csharp-track/vendor-dotnet.mjs.
// It is referenced by every learner compilation and loaded once in the default context, so the host finds the same attribute type.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace Dojo;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = false)]
public sealed class TestAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}

public sealed class AssertionException(string message) : Exception(message);

public static class Assert
{
    public static void Equal<T>(T expected, T actual, string? message = null)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw Failure(message, $"expected {Format(expected)}, got {Format(actual)}");
        }
    }

    public static void NotEqual<T>(T unexpected, T actual, string? message = null)
    {
        if (EqualityComparer<T>.Default.Equals(unexpected, actual))
        {
            throw Failure(message, $"expected a value other than {Format(unexpected)}");
        }
    }

    public static void Equal(double expected, double actual, double tolerance, string? message = null)
    {
        if (double.IsNaN(actual) || Math.Abs(expected - actual) > tolerance)
        {
            throw Failure(message, $"expected {Format(expected)} ± {Format(tolerance)}, got {Format(actual)}");
        }
    }

    public static void SequenceEqual<T>(IEnumerable<T> expected, IEnumerable<T>? actual, string? message = null)
    {
        if (actual is null)
        {
            throw Failure(message, $"expected {Format(expected)}, got null");
        }
        var expectedItems = expected.ToList();
        var actualItems = actual.ToList();
        if (!expectedItems.SequenceEqual(actualItems))
        {
            throw Failure(message, $"expected {Format(expectedItems)}, got {Format(actualItems)}");
        }
    }

    public static void True(bool condition, string? message = null)
    {
        if (!condition)
        {
            throw Failure(message, "expected true, got false");
        }
    }

    public static void False(bool condition, string? message = null)
    {
        if (condition)
        {
            throw Failure(message, "expected false, got true");
        }
    }

    public static void Null(object? value, string? message = null)
    {
        if (value is not null)
        {
            throw Failure(message, $"expected null, got {Format(value)}");
        }
    }

    public static T NotNull<T>(T? value, string? message = null) where T : class
    {
        return value ?? throw Failure(message, "expected a value, got null");
    }

    public static void Contains(string expectedSubstring, string? actual, string? message = null)
    {
        if (actual is null || !actual.Contains(expectedSubstring, StringComparison.Ordinal))
        {
            throw Failure(message, $"expected {Format(actual)} to contain {Format(expectedSubstring)}");
        }
    }

    public static void Contains<T>(T expected, IEnumerable<T>? collection, string? message = null)
    {
        if (collection is null || !collection.Contains(expected))
        {
            throw Failure(message, $"expected {Format(collection)} to contain {Format(expected)}");
        }
    }

    public static TException Throws<TException>(Action action, string? message = null) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException exception)
        {
            return exception;
        }
        catch (Exception exception)
        {
            throw Failure(message, $"expected {typeof(TException).Name}, got {exception.GetType().Name}: {exception.Message}");
        }
        throw Failure(message, $"expected {typeof(TException).Name}, nothing was thrown");
    }

    public static async Task<TException> ThrowsAsync<TException>(Func<Task> action, string? message = null) where TException : Exception
    {
        try
        {
            await action();
        }
        catch (TException exception)
        {
            return exception;
        }
        catch (Exception exception)
        {
            throw Failure(message, $"expected {typeof(TException).Name}, got {exception.GetType().Name}: {exception.Message}");
        }
        throw Failure(message, $"expected {typeof(TException).Name}, nothing was thrown");
    }

    public static void Fail(string message) => throw new AssertionException(message);

    private static AssertionException Failure(string? message, string detail) =>
        new(message is null ? detail : $"{message}: {detail}");

    private static string Format(object? value) => value switch
    {
        null => "null",
        string text => $"\"{text}\"",
        char character => $"'{character}'",
        bool flag => flag ? "true" : "false",
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        IEnumerable items => $"[{string.Join(", ", items.Cast<object?>().Select(Format))}]",
        _ => value.ToString() ?? value.GetType().Name,
    };
}
