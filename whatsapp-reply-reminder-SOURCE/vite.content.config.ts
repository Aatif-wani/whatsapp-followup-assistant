import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * WhatsApp Web content scripts are injected as plain (non-module)
 * scripts. Rollup/Vite's default ESM output uses `import` statements
 * for shared chunks, which Chrome refuses to execute in that context
 * ("Cannot use import statement outside a module"). This config builds
 * content.ts in isolation as a single IIFE bundle with no code-splitting
 * so it can be safely injected via manifest.json's content_scripts.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // preserve output from the main vite.config.ts build
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      formats: ['iife'],
      name: 'WhatsAppFollowUpContentScript',
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        // Force everything into a single file — no dynamic imports,
        // no shared chunks. Required for a valid content script.
        inlineDynamicImports: true,
      },
    },
  },
});
