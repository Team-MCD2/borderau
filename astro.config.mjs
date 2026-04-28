// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  // Intégrations : React pour les composants interactifs, Tailwind pour le styling
  integrations: [
    react(),       // Permet d'utiliser des composants React avec client:load
    tailwind(),    // Injecte automatiquement Tailwind dans toutes les pages
  ],

  adapter: vercel({}),

  // Mode server (SSR) — nécessaire pour les appels API Shopify côté serveur
  output: 'server',

  // Port de dev personnalisé
  server: {
    port: 4321,
  },
});
