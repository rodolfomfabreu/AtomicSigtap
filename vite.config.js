import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Atomic SIGTAP - build estático (dist/) servido pelo nginx.
// A porta de dev pode ser trocada com --port; em produção quem manda é o nginx.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: { sourcemap: false, chunkSizeWarningLimit: 800 },
});
