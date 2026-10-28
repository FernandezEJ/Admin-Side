import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolveApiBaseUrl } from './src/services/apiUrl.js';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const value = process.env.VITE_API_BASE_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL;
    resolveApiBaseUrl(value, false);
  }
  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  };
});
