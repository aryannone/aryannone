import { defineConfig } from 'vite';

export default defineConfig({
  // three.js is big; it is only loaded when someone enters the 3D campus
  build: { chunkSizeWarningLimit: 800 },
});
