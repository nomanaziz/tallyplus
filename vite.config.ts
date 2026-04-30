import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { componentTagger } from "lovable-tagger";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              "react-vendor": ["react", "react-dom"],
              "supabase": ["@supabase/supabase-js"],
              "query": ["@tanstack/react-query"],
              "radix": [
                "@radix-ui/react-dialog",
                "@radix-ui/react-dropdown-menu",
                "@radix-ui/react-popover",
                "@radix-ui/react-select",
                "@radix-ui/react-tabs",
                "@radix-ui/react-tooltip",
              ],
              "charts": ["recharts"],
              "icons": ["lucide-react"],
            },
          },
        },
      },
    },
  },
}));
