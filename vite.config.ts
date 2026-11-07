import { resolve } from 'node:path';
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { contentPlugin } from './plugins/contentPlugin.ts';
import { dotnetPlugin } from './plugins/dotnetPlugin.ts';
import { pyodidePlugin } from './plugins/pyodidePlugin.ts';
import { pythonWorkerCspPlugin } from './plugins/pythonWorkerCspPlugin.ts';
import { sentryTunnelProxy } from './plugins/sentryTunnel.ts';
import { scaledBudget } from './src/verify/timeBudget.ts';

const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);
const sentryRelease = process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA;
const sentryReleaseCreated = sentryUploadEnabled && sentryRelease !== undefined;

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    contentPlugin(),
    pyodidePlugin(),
    dotnetPlugin(),
    pythonWorkerCspPlugin(),
    sentryVitePlugin({
      org: 'lcruz-development',
      project: 'advanced-dev-dojo-ultimate-master',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      silent: !sentryUploadEnabled,
      errorHandler: (error) => console.warn(`[sentry] ${error.message}`),
      release: {
        name: sentryRelease,
        inject: false,
        create: sentryReleaseCreated,
        finalize: sentryReleaseCreated,
        setCommits: sentryReleaseCreated ? { auto: true, ignoreMissing: true, ignoreEmpty: true } : false,
        deploy: sentryReleaseCreated ? { env: process.env.WORKERS_CI_BRANCH === 'main' ? 'production' : 'preview' } : false,
      },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${resolve(import.meta.dirname, 'src')}/` },
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
      { find: /^@vue\/compiler-sfc$/, replacement: '@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js' },
    ],
  },
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease ?? ''),
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  preview: { proxy: sentryTunnelProxy(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_SENTRY_DSN) },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 12000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        sandbox: resolve(import.meta.dirname, 'sandbox.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'plugins/**/*.test.js', 'scripts/**/*.test.mjs'],
    exclude: ['src/content/*/**', 'node_modules/**'],
    testTimeout: scaledBudget(60000),
    fsModuleCache: false,
    dangerouslyIgnoreUnhandledErrors: true,
    server: { deps: { inline: [/@angular/, /@ngrx/] } },
  },
}));
