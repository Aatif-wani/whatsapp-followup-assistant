import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Copies static extension assets (manifest.json, icons) into dist/
 * after the Vite build completes. Chrome extensions require these
 * files to sit at the root of the output directory.
 */
function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

      copyFileSync(
        resolve(__dirname, 'src/manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      const iconsSrc = resolve(__dirname, 'public/icons');
      const iconsDest = resolve(distDir, 'icons');
      if (existsSync(iconsSrc)) {
        cpSync(iconsSrc, iconsDest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssets()],
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
    emptyOutDir: true, // safe: this build runs first, content build runs second with emptyOutDir:false
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          // Background is loaded as an ES module (manifest declares
          // background.type = "module"), so it can keep its imports.
          // Its filename must stay fixed since manifest.json references it.
          if (chunk.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
