import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://127.0.0.1:4200',
      '/status': 'http://127.0.0.1:4200',
      '/identity': 'http://127.0.0.1:4200',
      '/models': 'http://127.0.0.1:4200',
      '/providers': 'http://127.0.0.1:4200',
      '/routing': 'http://127.0.0.1:4200',
      '/chat': 'http://127.0.0.1:4200',
      '/events': 'http://127.0.0.1:4200',
      '/memory': 'http://127.0.0.1:4200',
      '/conversations': 'http://127.0.0.1:4200',
      '/tools': 'http://127.0.0.1:4200',
      '/approvals': 'http://127.0.0.1:4200',
      '/audit': 'http://127.0.0.1:4200',
      '/agents': 'http://127.0.0.1:4200',
      '/tasks': 'http://127.0.0.1:4200',
      '/missions': 'http://127.0.0.1:4200',
      '/goals': 'http://127.0.0.1:4200',
      '/companies': 'http://127.0.0.1:4200',
      '/projects': 'http://127.0.0.1:4200',
      '/environment': 'http://127.0.0.1:4200',
      '/environments': 'http://127.0.0.1:4200',
      '/voice': 'http://127.0.0.1:4200',
      '/schedules': 'http://127.0.0.1:4200',
      '/capabilities': 'http://127.0.0.1:4200',
      '/governance': 'http://127.0.0.1:4200',
      '/skills': 'http://127.0.0.1:4200',
      '/mcp': 'http://127.0.0.1:4200',
      '/knowledge': 'http://127.0.0.1:4200',
      '/multimodal': 'http://127.0.0.1:4200',
      '/workspace': 'http://127.0.0.1:4200',
      '/self': 'http://127.0.0.1:4200',
      '/research': 'http://127.0.0.1:4200',
      '/computer': 'http://127.0.0.1:4200',
      '/integrations': 'http://127.0.0.1:4200'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  }
});
