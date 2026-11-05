// Converts .NET assemblies (PE files) to Webcil wrapped in a WebAssembly module, the format the .NET 10 WebAssembly SDK publishes
// assemblies in, with the converter of Microsoft.NET.Sdk.WebAssembly.Pack. Compiled and run by vendor-dotnet.mjs at install time only.
// Usage: dotnet WebcilConvert.dll <input.dll> <output.wasm> [<input.dll> <output.wasm> ...]
using System;
using Microsoft.NET.WebAssembly.Webcil;

if (args.Length == 0 || args.Length % 2 != 0)
{
    Console.Error.WriteLine("usage: WebcilConvert <input.dll> <output.wasm> [<input.dll> <output.wasm> ...]");
    return 2;
}
for (var index = 0; index < args.Length; index += 2)
{
    var converter = WebcilConverter.FromPortableExecutable(args[index], args[index + 1]);
    converter.WrapInWebAssembly = true;
    converter.ConvertToWebcil();
}
return 0;
