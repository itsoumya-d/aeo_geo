import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // This standalone entry never imports auth, analytics, or provider services.
    envDir: false,
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
