import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const config = { plugins: [react()] };
  if (command !== 'build') return config;

  const configured = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim() || '/api';
  let apiBase = configured;
  if (!configured.startsWith('/') || configured.startsWith('//')) {
    const url = new URL(configured);
    if (url.hostname === 'localhost' || url.hostname === '[::1]' || /^127\./.test(url.hostname)) apiBase = '/api';
    else if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('Configure VITE_API_URL com um caminho local ou uma URL HTTPS pública da API.');
    }
  }
  config.define = { 'import.meta.env.VITE_API_URL': JSON.stringify(apiBase.replace(/\/$/, '')) };
  return config;
});
