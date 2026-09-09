import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/hurdle/',
  plugins: [react()],
  build: { target: 'es2022', rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/data/catalog-')) return 'almanac';
    if (id.includes('/node_modules/react')) return 'react';
  } } } },
});
