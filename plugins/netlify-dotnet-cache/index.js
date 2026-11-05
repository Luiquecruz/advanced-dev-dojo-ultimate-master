// Local Netlify build plugin (netlify.toml [[plugins]]): keeps the C# engine's downloads between deploys. postinstall skips the
// .NET vendor step on Netlify (vendor-dotnet.mjs --postinstall), onPreBuild restores vendor/dotnet/.cache, the build command then
// runs `npm run csharp:vendor` (which checks every cached package and runtime archive against its SHA-512 pin, so the cache is not
// trusted) and onPostBuild saves the cache for the next deploy. Without a cache the step downloads about 111 MB.

/** Folders of vendor/dotnet/.cache kept between builds: the NuGet packages and the .NET runtime archive (not its extraction). */
export const CACHED_PATHS = ['vendor/dotnet/.cache/nuget', 'vendor/dotnet/.cache/toolchain'];

/**
 * @param {{ utils: { cache: { restore(path: string): Promise<boolean> } } }} options
 */
export async function onPreBuild({ utils }) {
  for (const path of CACHED_PATHS) {
    const restored = await utils.cache.restore(path);
    console.log(`netlify-dotnet-cache: ${restored ? 'restored' : 'no cache for'} ${path}`);
  }
}

/**
 * @param {{ utils: { cache: { save(path: string): Promise<boolean> } } }} options
 */
export async function onPostBuild({ utils }) {
  for (const path of CACHED_PATHS) {
    const saved = await utils.cache.save(path);
    console.log(`netlify-dotnet-cache: ${saved ? 'saved' : 'nothing to save in'} ${path}`);
  }
}
