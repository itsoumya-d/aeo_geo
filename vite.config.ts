/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const vendorReact = ['react', 'react-dom', 'react-router-dom', 'zustand', '@vuer-ai/react-helmet-async'];
  const vendorUi = ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge'];
  const vendorCharts = ['recharts'];
  const vendorSupabase = ['@supabase/supabase-js'];
  const vendorI18n = ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'];
  const vendorDnd = ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'];

  const chunkFromId = (id: string): string | undefined => {
    if (id.includes('node_modules/html2pdf.js')) return 'vendor-export-html2pdf';
    if (id.includes('node_modules/jspdf')) return 'vendor-export-jspdf';
    if (id.includes('node_modules/html2canvas')) return 'vendor-export-html2canvas';
    if (id.includes('node_modules/canvg')) return 'vendor-export-canvg';

    if (vendorReact.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-react';
    if (vendorUi.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-ui';
    if (vendorCharts.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-charts';
    if (vendorSupabase.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-supabase';
    if (vendorI18n.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-i18n';
    if (vendorDnd.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return 'vendor-dnd';
    return undefined;
  };

  return {
    base: '/',
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // Removed for security
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    optimizeDeps: {
      include: ['react-is']
    },
    build: {
      chunkSizeWarningLimit: 1200, // export libs are lazy-loaded and intentionally large
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            return chunkFromId(id);
          }
        }
      }
    }
  };
});
