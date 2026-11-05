using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Dojo.Host;

/// <summary>A [Test("name")] method declared in the tests file, in source order.</summary>
internal sealed record DiscoveredTest(string Name, string TypeName, string MethodName);

internal static class Harness
{
    private const string TestingAssembly = "Dojo.Testing";

    /// <summary>
    /// The tests declared in the tests file only, read from the compilation, so a [Test] method in learner code is never run
    /// and the order matches the names the editor lists before the first run.
    /// </summary>
    public static List<DiscoveredTest> Discover(CSharpCompilation compilation, SyntaxTree testsTree)
    {
        var model = compilation.GetSemanticModel(testsTree);
        var tests = new List<DiscoveredTest>();
        foreach (var declaration in testsTree.GetRoot().DescendantNodes().OfType<MethodDeclarationSyntax>())
        {
            if (model.GetDeclaredSymbol(declaration) is not IMethodSymbol method)
            {
                continue;
            }
            var attribute = method.GetAttributes().FirstOrDefault(candidate =>
                candidate.AttributeClass is { Name: "TestAttribute" } attributeClass && attributeClass.ContainingAssembly.Name == TestingAssembly);
            if (attribute is null)
            {
                continue;
            }
            var name = attribute.ConstructorArguments.FirstOrDefault().Value as string ?? method.Name;
            tests.Add(new DiscoveredTest(name, ReflectionName(method.ContainingType), method.MetadataName));
        }
        return tests;
    }

    /// <summary>Runs the tests from <paramref name="startAt"/> and writes the "results" array; each test is framed by start/result events.</summary>
    public static async Task RunAll(Assembly assembly, List<DiscoveredTest> tests, int startAt, Json json)
    {
        json.Name("results").BeginArray();
        for (var index = Math.Max(0, startAt); index < tests.Count; index += 1)
        {
            var test = tests[index];
            Events.TestStart(index, tests.Count, test.Name);
            var error = await RunOne(assembly, test);
            Events.TestResult(index, test.Name, error is null, error);
            json.BeginObject().Property("name", test.Name).Property("passed", error is null);
            if (error is not null)
            {
                json.Property("error", error);
            }
            json.EndObject();
        }
        json.EndArray();
    }

    private static async Task<string?> RunOne(Assembly assembly, DiscoveredTest test)
    {
        var type = assembly.GetType(test.TypeName);
        var method = type?.GetMethod(test.MethodName, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance, Type.EmptyTypes);
        if (type is null || method is null)
        {
            return $"{test.TypeName}.{test.MethodName} must take no parameters";
        }
        using var console = ConsoleCapture.Start();
        try
        {
            var target = method.IsStatic ? null : Activator.CreateInstance(type, nonPublic: true);
            if (method.Invoke(target, null) is Task task)
            {
                await task;
            }
            return null;
        }
        catch (TargetInvocationException exception) when (exception.InnerException is not null)
        {
            return Describe(exception.InnerException);
        }
        catch (Exception exception)
        {
            return Describe(exception);
        }
    }

    private static string Describe(Exception exception) =>
        exception is AssertionException ? exception.Message : $"{exception.GetType().Name}: {exception.Message}";

    private static string ReflectionName(INamedTypeSymbol type)
    {
        var name = type.MetadataName;
        for (var outer = type.ContainingType; outer is not null; outer = outer.ContainingType)
        {
            name = $"{outer.MetadataName}+{name}";
        }
        var containingNamespace = type.ContainingNamespace;
        return containingNamespace is null || containingNamespace.IsGlobalNamespace ? name : $"{containingNamespace.ToDisplayString()}.{name}";
    }
}

/// <summary>Redirects Console.Out and Console.Error to console events, one event per line, until disposed.</summary>
internal sealed class ConsoleCapture : IDisposable
{
    private readonly TextWriter previousOut = Console.Out;
    private readonly TextWriter previousError = Console.Error;
    private readonly EventWriter output = new("log");
    private readonly EventWriter error = new("error");

    private ConsoleCapture()
    {
        Console.SetOut(output);
        Console.SetError(error);
    }

    public static ConsoleCapture Start() => new();

    public void Flush()
    {
        output.Flush();
        error.Flush();
    }

    public void Dispose()
    {
        Flush();
        Console.SetOut(previousOut);
        Console.SetError(previousError);
    }

    /// <summary>Buffers console text into events of at most MaxBuffered characters and stops after MaxTotal characters (one notice instead).</summary>
    private sealed class EventWriter(string level) : TextWriter
    {
        private const int MaxBuffered = 8192;
        private const int MaxTotal = 1_000_000;
        private readonly StringBuilder buffer = new();
        private int written;
        private bool truncated;

        public override Encoding Encoding => Encoding.UTF8;

        public override void Write(char value)
        {
            if (truncated)
            {
                return;
            }
            buffer.Append(value);
            if (value == '\n' || buffer.Length >= MaxBuffered)
            {
                Flush();
            }
        }

        public override void Write(string? value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return;
            }
            for (var offset = 0; offset < value.Length && !truncated;)
            {
                var length = Math.Min(value.Length - offset, MaxBuffered - buffer.Length);
                buffer.Append(value, offset, length);
                offset += length;
                if (buffer.Length >= MaxBuffered)
                {
                    Flush();
                }
            }
            if (value.Contains('\n'))
            {
                Flush();
            }
        }

        public override void Flush()
        {
            if (buffer.Length == 0 || truncated)
            {
                buffer.Clear();
                return;
            }
            if (written + buffer.Length > MaxTotal)
            {
                truncated = true;
                buffer.Clear();
                Events.Console(level, $"[output truncated after {MaxTotal:N0} characters]\n");
                return;
            }
            written += buffer.Length;
            Events.Console(level, buffer.ToString());
            buffer.Clear();
        }
    }
}
