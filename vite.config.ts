import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://<user>.github.io/Camera-/
export default defineConfig({
  base: '/Camera-/',
  plugins: [react()],
});
