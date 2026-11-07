import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona igual en GitHub Pages (/<repo>/) que en local.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
