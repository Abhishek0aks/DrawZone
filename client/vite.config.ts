import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `host: true` lets other devices on the same Wi-Fi open the game (http://<your-ip>:5173).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
