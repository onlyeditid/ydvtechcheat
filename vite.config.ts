import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tauri-apps/api/core': path.resolve(__dirname, './src/lib/tauri-shim/core.ts'),
        '@tauri-apps/api/event': path.resolve(__dirname, './src/lib/tauri-shim/event.ts'),
        '@tauri-apps/api/window': path.resolve(__dirname, './src/lib/tauri-shim/window.ts'),
        '@tauri-apps/api/webviewWindow': path.resolve(__dirname, './src/lib/tauri-shim/window.ts'),
        '@tauri-apps/plugin-sql': path.resolve(__dirname, './src/lib/tauri-shim/plugin-sql.ts'),
        '@tauri-apps/plugin-http': path.resolve(__dirname, './src/lib/tauri-shim/plugin-http.ts'),
        '@tauri-apps/plugin-opener': path.resolve(__dirname, './src/lib/tauri-shim/plugin-opener.ts'),
        '@tauri-apps/plugin-autostart': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        '@tauri-apps/plugin-updater': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        '@tauri-apps/plugin-process': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        '@tauri-apps/plugin-global-shortcut': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        'tauri-plugin-macos-permissions-api': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        'tauri-plugin-posthog-api': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
        'tauri-plugin-keychain': path.resolve(__dirname, './src/lib/tauri-shim/plugin-stubs.ts'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
