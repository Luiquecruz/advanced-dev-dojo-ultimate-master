// DojoHost.dll: compiles learner C# with Roslyn inside the .NET WebAssembly runtime and runs it, either the lesson tests
// (Harness.cs) or the program's entry point. Compiled by scripts/csharp-track/vendor-dotnet.mjs; the C# worker calls the
// [JSExport] methods and receives events through the "dojo-host" module it registers with setModuleImports.
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Loader;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Dojo.Host;

public static partial class DojoHost
{
    /// <summary>Folder of the reference assemblies in the runtime's virtual file system (the worker mounts them there).</summary>
    private const string ReferenceDirectory = "/ref";

    private const string GlobalUsings = """
        global using System;
        global using System.Collections.Generic;
        global using System.Linq;
        global using System.Threading.Tasks;
        """;

    /// <summary>`///` comments are not processed: Roslyn would need System.Xml.ReaderWriter for them (CS1569) and no XML file is written.</summary>
    private static readonly CSharpParseOptions ParseOptions = new(LanguageVersion.Latest, DocumentationMode.None);

    /// <summary>Namespaces learner code may not name in a string literal (defence in depth; the worker blocks JavaScript binding itself).</summary>
    private static readonly string[] RefusedNamespaces = ["System.Reflection.Emit", "System.Runtime.InteropServices.JavaScript"];

    private static readonly DiagnosticDescriptor RefusedApi = new(
        "DOJO001", "API not available", "{0} is not available in the Dojo C# sandbox", "Dojo", DiagnosticSeverity.Error, isEnabledByDefault: true);

    private static ImmutableArray<MetadataReference> references;

    /// <summary>
    /// Compiles the learner files with the tests and runs every test from <paramref name="startAt"/>; resolves to the JSON report.
    /// Asynchronous so a test that awaits (Task.Delay, Task.Yield) yields to the JavaScript event loop: the runtime is single-threaded
    /// and blocking on an unfinished task throws PlatformNotSupportedException.
    /// </summary>
    [JSExport]
    public static async Task<string> RunTests(string[] fileNames, string[] fileSources, string testsName, string tests, int startAt)
    {
        var started = Environment.TickCount64;
        var testsTree = CSharpSyntaxTree.ParseText(tests, ParseOptions, testsName);
        var kind = fileSources.Any(HasTopLevelStatements) ? OutputKind.ConsoleApplication : OutputKind.DynamicallyLinkedLibrary;
        var compilation = Compile(kind, fileNames, fileSources, testsTree);
        var emitted = Emit(compilation);
        var json = new Json().BeginObject();
        WriteDiagnostics(json, emitted.Diagnostics);
        if (emitted.Image is null)
        {
            json.Property("compileError", FormatErrors(emitted.Diagnostics));
            json.Name("results").BeginArray().EndArray();
        }
        else
        {
            var discovered = Harness.Discover(compilation, testsTree);
            await Run(emitted.Image, assembly => Harness.RunAll(assembly, discovered, startAt, json));
        }
        return json.Property("durationMs", Environment.TickCount64 - started).EndObject().ToString();
    }

    /// <summary>Compiles the learner files as a console program and runs its entry point, awaiting an async Main; console output arrives as events.</summary>
    [JSExport]
    public static async Task<string> RunProgram(string[] fileNames, string[] fileSources)
    {
        var compilation = Compile(OutputKind.ConsoleApplication, fileNames, fileSources, null);
        var emitted = Emit(compilation);
        var json = new Json().BeginObject();
        WriteDiagnostics(json, emitted.Diagnostics);
        if (emitted.Image is null)
        {
            return json.Property("compileError", FormatErrors(emitted.Diagnostics)).Property("exitCode", 1).EndObject().ToString();
        }
        var exitCode = 0;
        await Run(emitted.Image, async assembly =>
        {
            var entryPoint = assembly.EntryPoint;
            if (entryPoint is null)
            {
                json.Property("error", "The program has no entry point (a Main method or top-level statements).");
                exitCode = 1;
                return;
            }
            var target = AwaitableMain(entryPoint);
            using var console = ConsoleCapture.Start();
            try
            {
                var arguments = target.GetParameters().Length == 0 ? null : new object?[] { Array.Empty<string>() };
                var returned = target.Invoke(null, arguments);
                if (returned is Task task)
                {
                    await task;
                    returned = task is Task<int> withCode ? withCode.Result : null;
                }
                exitCode = returned is int code ? code : 0;
            }
            catch (Exception exception)
            {
                var thrown = exception is TargetInvocationException { InnerException: { } inner } ? inner : exception;
                console.Flush();
                Events.Console("error", $"Unhandled exception. {thrown.GetType().FullName}: {thrown.Message}\n");
                exitCode = 1;
            }
        });
        return json.Property("exitCode", exitCode).EndObject().ToString();
    }

    /// <summary>Compiles and emits a small program so Roslyn's code is loaded and warmed before the learner's first run.</summary>
    [JSExport]
    public static void Warm()
    {
        var tree = CSharpSyntaxTree.ParseText("public static class Warm { public static int Sum(int[] items) => items.Where(item => item > 0).Sum(); }", ParseOptions, "Warm.cs");
        Emit(Compile(OutputKind.DynamicallyLinkedLibrary, [], [], tree));
    }

    /// <summary>
    /// Whether a learner file has top-level statements (a Program.cs demo); the tests then compile as a console application, whose
    /// entry point is never invoked by the harness, because a library cannot hold top-level statements (CS8805).
    /// </summary>
    private static bool HasTopLevelStatements(string source) =>
        CSharpSyntaxTree.ParseText(source, ParseOptions).GetCompilationUnitRoot().Members.Any(member => member is GlobalStatementSyntax);

    /// <summary>
    /// The async method behind a compiler-generated synchronous entry point (async Main or top-level statements with await), which
    /// would block on the task; the synchronous entry point itself otherwise.
    /// </summary>
    private static MethodInfo AwaitableMain(MethodInfo entryPoint)
    {
        if (entryPoint.Name != "<Main>" || entryPoint.DeclaringType is not { } type)
        {
            return entryPoint;
        }
        const BindingFlags all = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
        return type.GetMethods(all).FirstOrDefault(method =>
            method != entryPoint && method.Name is "Main" or "<Main>$" && typeof(Task).IsAssignableFrom(method.ReturnType)) ?? entryPoint;
    }

    private static CSharpCompilation Compile(OutputKind kind, string[] fileNames, string[] fileSources, SyntaxTree? extra)
    {
        if (fileNames.Length != fileSources.Length)
        {
            throw new ArgumentException("fileNames and fileSources must have the same length");
        }
        var trees = new List<SyntaxTree> { CSharpSyntaxTree.ParseText(GlobalUsings, ParseOptions, "GlobalUsings.g.cs") };
        for (var index = 0; index < fileNames.Length; index += 1)
        {
            trees.Add(CSharpSyntaxTree.ParseText(fileSources[index], ParseOptions, fileNames[index]));
        }
        if (extra is not null)
        {
            trees.Add(extra);
        }
        var options = new CSharpCompilationOptions(kind, nullableContextOptions: NullableContextOptions.Enable, concurrentBuild: false, allowUnsafe: false);
        return CSharpCompilation.Create($"Learner{Guid.NewGuid():N}", trees, References(), options);
    }

    private static ImmutableArray<MetadataReference> References()
    {
        if (references.IsDefault)
        {
            references = [.. Directory.GetFiles(ReferenceDirectory, "*.dll").Order(StringComparer.Ordinal).Select(path => (MetadataReference)MetadataReference.CreateFromFile(path))];
        }
        return references;
    }

    private static (byte[]? Image, ImmutableArray<Diagnostic> Diagnostics) Emit(CSharpCompilation compilation)
    {
        var refused = Refusals(compilation);
        if (refused.Length > 0)
        {
            return (null, refused);
        }
        using var stream = new MemoryStream();
        var result = compilation.Emit(stream);
        var diagnostics = result.Diagnostics.Where(diagnostic => diagnostic.Severity is DiagnosticSeverity.Error or DiagnosticSeverity.Warning).ToImmutableArray();
        return (result.Success ? stream.ToArray() : null, diagnostics);
    }

    /// <summary>
    /// A DOJO001 error for every string literal that names a refused namespace, such as Type.GetType("System.Reflection.Emit.DynamicMethod").
    /// Names built at run time get past it; it only turns the plain reflection probe into a clear compile error.
    /// </summary>
    private static ImmutableArray<Diagnostic> Refusals(CSharpCompilation compilation) =>
        [.. compilation.SyntaxTrees
            .SelectMany(tree => tree.GetRoot().DescendantTokens())
            .Where(token => token.IsKind(SyntaxKind.StringLiteralToken) || token.IsKind(SyntaxKind.InterpolatedStringTextToken)
                || token.IsKind(SyntaxKind.SingleLineRawStringLiteralToken) || token.IsKind(SyntaxKind.MultiLineRawStringLiteralToken)
                || token.IsKind(SyntaxKind.Utf8StringLiteralToken))
            .SelectMany(token => RefusedNamespaces.Where(name => token.ValueText.Contains(name, StringComparison.Ordinal)).Select(name => Diagnostic.Create(RefusedApi, token.GetLocation(), name)))];

    /// <summary>Loads the emitted assembly in a collectible context, so its static state is dropped after the run.</summary>
    private static async Task Run(byte[] image, Func<Assembly, Task> action)
    {
        var context = new AssemblyLoadContext("learner", isCollectible: true);
        try
        {
            using var stream = new MemoryStream(image);
            await action(context.LoadFromStream(stream));
        }
        finally
        {
            context.Unload();
        }
    }

    private static void WriteDiagnostics(Json json, ImmutableArray<Diagnostic> diagnostics)
    {
        json.Name("diagnostics").BeginArray();
        foreach (var diagnostic in diagnostics)
        {
            var span = diagnostic.Location.GetLineSpan();
            json.BeginObject()
                .Property("file", span.Path ?? string.Empty)
                .Property("line", span.StartLinePosition.Line + 1)
                .Property("column", span.StartLinePosition.Character + 1)
                .Property("endLine", span.EndLinePosition.Line + 1)
                .Property("endColumn", span.EndLinePosition.Character + 1)
                .Property("severity", diagnostic.Severity == DiagnosticSeverity.Error ? "error" : "warning")
                .Property("code", diagnostic.Id)
                .Property("message", diagnostic.GetMessage(CultureInfo.InvariantCulture))
                .EndObject();
        }
        json.EndArray();
    }

    private static string FormatErrors(ImmutableArray<Diagnostic> diagnostics) =>
        string.Join("\n", diagnostics.Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error).Select(diagnostic =>
        {
            var span = diagnostic.Location.GetLineSpan();
            return $"{(string.IsNullOrEmpty(span.Path) ? "C#" : span.Path)}({span.StartLinePosition.Line + 1},{span.StartLinePosition.Character + 1}): error {diagnostic.Id}: {diagnostic.GetMessage(CultureInfo.InvariantCulture)}";
        }));
}

/// <summary>Events streamed to the worker while code runs: test start and result (the host's per-test timer) and console output.</summary>
internal static partial class Events
{
    [JSImport("emit", "dojo-host")]
    private static partial void Emit(string json);

    public static void TestStart(int index, int total, string name) =>
        Emit(new Json().BeginObject().Property("type", "start").Property("index", index).Property("total", total).Property("name", name).EndObject().ToString());

    public static void TestResult(int index, string name, bool passed, string? error)
    {
        var json = new Json().BeginObject().Property("type", "result").Property("index", index).Name("result").BeginObject().Property("name", name).Property("passed", passed);
        if (error is not null)
        {
            json.Property("error", error);
        }
        Emit(json.EndObject().EndObject().ToString());
    }

    public static void Console(string level, string text) =>
        Emit(new Json().BeginObject().Property("type", "console").Property("level", level).Property("text", text).EndObject().ToString());
}
