import { resolve } from 'node:path';
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { contentPlugin } from './plugins/contentPlugin.ts';
import { dotnetPlugin } from './plugins/dotnetPlugin.ts';
import { pyodidePlugin } from './plugins/pyodidePlugin.ts';
import { pythonWorkerCspPlugin } from './plugins/pythonWorkerCspPlugin.ts';
import { scaledBudget } from './src/verify/timeBudget.ts';

const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    contentPlugin(),
    pyodidePlugin(),
    dotnetPlugin(),
    pythonWorkerCspPlugin(),
    sentryVitePlugin({
      disable: !sentryUploadEnabled,
      org: 'lcruz-development',
      project: 'advanced-dev-dojo-ultimate-master',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
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
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: sentryUploadEnabled ? 'hidden' : false,
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
    include: ['src/**/*.test.ts', 'plugins/**/*.test.js'],
    exclude: ['src/content/*/**', 'node_modules/**'],
    testTimeout: scaledBudget(60000),
    fsModuleCache: false,
    dangerouslyIgnoreUnhandledErrors: true,
    server: { deps: { inline: [/@angular/, /@ngrx/] } },
  },
});
