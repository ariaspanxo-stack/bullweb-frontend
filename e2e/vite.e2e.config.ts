// E2E-1: build y preview locales (127.0.0.1:5175 -> backend 4299). Solo para npm run e2e:local; dist del deploy no se toca.
import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from 'vite';
import base from '../vite.config';

const target = 'http://127.0.0.1:4299';
export default defineConfig((env: ConfigEnv) => mergeConfig((base as (e: ConfigEnv) => UserConfig)(env), {
  build: { outDir: 'e2e/.dist', emptyOutDir: true },
  preview: {
    host: '127.0.0.1', port: 5175, strictPort: true,
    proxy: { '/api': target, '/uploads': target, '/socket.io': { target, ws: true } },
  },
}));
