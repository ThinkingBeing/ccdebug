import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
export default defineConfig({
    plugins: [vue()],
    root: '.',
    publicDir: 'public',
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    server: {
        port: 5173,
        host: true,
        hmr: {
            port: 5174,
        },
        watch: {
            usePolling: true,
            interval: 100,
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: resolve(__dirname, 'index.html')
        },
        sourcemap: true
    },
    css: {
        devSourcemap: true
    },
    esbuild: {
        sourcemap: true
    }
});
