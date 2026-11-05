// Kept out of index.js: Netlify treats every export of a build plugin's entry module as an event handler.

/** Folders of vendor/dotnet/.cache kept between builds: the NuGet packages and the .NET runtime archive (not its extraction). */
export const CACHED_PATHS = ['vendor/dotnet/.cache/nuget', 'vendor/dotnet/.cache/toolchain'];
