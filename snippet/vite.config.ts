import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'EagleSnippet',
      fileName: 'snippet',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
        // Ensure rrweb's internal modules are not tree-shaken
        // which can strip the snapshot/serialization logic
        inlineDynamicImports: true,
      },
      // Disable tree-shaking to prevent rrweb snapshot module from being stripped
      treeshake: false,
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
});
