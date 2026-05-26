import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = 47291;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // 127.0.0.1 evita AggregateError en Windows (localhost → IPv6 vs IPv4)
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
