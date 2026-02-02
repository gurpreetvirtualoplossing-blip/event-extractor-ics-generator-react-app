import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',

      // ✅ Allow ngrok domains
      allowedHosts: ['.ngrok-free.dev'],

      // 🔥 ADD THIS (CORS FIX)
      proxy: {
        '/api': {
          target: 'http://localhost/backend',
          changeOrigin: true,
        },
      },
    },

    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
