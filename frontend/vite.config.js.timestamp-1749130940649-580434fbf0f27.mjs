// vite.config.js
import { defineConfig, loadEnv } from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import vueDevTools from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { visualizer } from "file:///home/admin/dev/lx-annotate/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_import_meta_url = "file:///home/admin/dev/lx-annotate/frontend/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: mode === "development" ? "http://localhost:3000/" : "./",
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      // Bundle analyzer - only in build mode
      ...command === "build" ? [
        visualizer({
          filename: "dist/bundle-analysis.html",
          open: true,
          gzipSize: true,
          brotliSize: true
        })
      ] : []
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        // one alias is enough
        "@components": resolve(__dirname, "src/components"),
        "@views": resolve(__dirname, "src/views"),
        "@services": resolve(__dirname, "src/services"),
        "@utils": resolve(__dirname, "src/utils"),
        "@stores": resolve(__dirname, "src/stores"),
        "@types": resolve(__dirname, "src/types")
      }
    },
    server: {
      cors: true,
      port: 8e3,
      hmr: { host: "localhost" },
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false
        },
        "/media": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false
        },
        "/static": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      target: "es2020",
      manifest: mode === "production" ? "manifest.json" : false,
      outDir: resolve(__dirname, "../static/dist"),
      assetsDir: "assets",
      sourcemap: mode === "development",
      minify: "terser",
      // Code splitting and chunk optimization
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/main.ts")
        },
        output: {
          manualChunks: {
            // Vendor chunks
            "vendor-vue": ["vue", "vue-router", "pinia"],
            "vendor-ui": ["@headlessui/vue", "@heroicons/vue"],
            "vendor-utils": ["axios", "js-cookie"]
          },
          // Asset naming
          chunkFileNames: "js/[name]-[hash].js",
          entryFileNames: "js/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split(".").pop() || "";
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `img/[name]-[hash][extname]`;
            }
            if (/css/i.test(extType)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          }
        }
      },
      // Terser options for better minification
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production"
        }
      }
    },
    css: {
      devSourcemap: mode === "development",
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`
        }
      }
    },
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
    },
    // Dependency optimization
    optimizeDeps: {
      include: ["vue", "vue-router", "pinia", "axios"],
      exclude: ["@vueuse/core"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FkbWluL2Rldi9seC1hbm5vdGF0ZS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCc7XG5pbXBvcnQgdnVlRGV2VG9vbHMgZnJvbSAndml0ZS1wbHVnaW4tdnVlLWRldnRvb2xzJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJzsgLy8gXHUyMTkwIGFkZCBkaXJuYW1lXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbi8vIC0tLS0gbWFrZSB0aGUgQ29tbW9uSlMtc3R5bGUgZ2xvYmFscyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gZGlybmFtZShfX2ZpbGVuYW1lKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XG4gICAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYmFzZTogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyA/ICdodHRwOi8vbG9jYWxob3N0OjMwMDAvJyA6ICcuLycsXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHZ1ZSgpLFxuICAgICAgICAgICAgdnVlSnN4KCksXG4gICAgICAgICAgICB2dWVEZXZUb29scygpLFxuICAgICAgICAgICAgLy8gQnVuZGxlIGFuYWx5emVyIC0gb25seSBpbiBidWlsZCBtb2RlXG4gICAgICAgICAgICAuLi4oY29tbWFuZCA9PT0gJ2J1aWxkJyA/IFtcbiAgICAgICAgICAgICAgICB2aXN1YWxpemVyKHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6ICdkaXN0L2J1bmRsZS1hbmFseXNpcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF0gOiBbXSlcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksIC8vIG9uZSBhbGlhcyBpcyBlbm91Z2hcbiAgICAgICAgICAgICAgICAnQGNvbXBvbmVudHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb21wb25lbnRzJyksXG4gICAgICAgICAgICAgICAgJ0B2aWV3cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3ZpZXdzJyksXG4gICAgICAgICAgICAgICAgJ0BzZXJ2aWNlcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3NlcnZpY2VzJyksXG4gICAgICAgICAgICAgICAgJ0B1dGlscyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3V0aWxzJyksXG4gICAgICAgICAgICAgICAgJ0BzdG9yZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9zdG9yZXMnKSxcbiAgICAgICAgICAgICAgICAnQHR5cGVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdHlwZXMnKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlcjoge1xuICAgICAgICAgICAgY29yczogdHJ1ZSxcbiAgICAgICAgICAgIHBvcnQ6IDgwMDAsXG4gICAgICAgICAgICBobXI6IHsgaG9zdDogJ2xvY2FsaG9zdCcgfSxcbiAgICAgICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnL21lZGlhJzoge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9CQVNFX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJy9zdGF0aWMnOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgICAgICAgIG1hbmlmZXN0OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAnbWFuaWZlc3QuanNvbicgOiBmYWxzZSxcbiAgICAgICAgICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zdGF0aWMvZGlzdCcpLFxuICAgICAgICAgICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICAgICAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICAgICAgICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgICAgICAgICAvLyBDb2RlIHNwbGl0dGluZyBhbmQgY2h1bmsgb3B0aW1pemF0aW9uXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbWFpbi50cycpLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmVuZG9yIGNodW5rc1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3ZlbmRvci12dWUnOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAndmVuZG9yLXVpJzogWydAaGVhZGxlc3N1aS92dWUnLCAnQGhlcm9pY29ucy92dWUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd2ZW5kb3ItdXRpbHMnOiBbJ2F4aW9zJywgJ2pzLWNvb2tpZSddLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAvLyBBc3NldCBuYW1pbmdcbiAgICAgICAgICAgICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dFR5cGUgPSBhc3NldEluZm8ubmFtZT8uc3BsaXQoJy4nKS5wb3AoKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgvcG5nfGpwZT9nfHN2Z3xnaWZ8dGlmZnxibXB8aWNvL2kudGVzdChleHRUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgaW1nL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKC9jc3MvaS50ZXN0KGV4dFR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBjc3MvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBUZXJzZXIgb3B0aW9ucyBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxuICAgICAgICAgICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3BfY29uc29sZTogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiBtb2RlID09PSAncHJvZHVjdGlvbicsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNzczoge1xuICAgICAgICAgICAgZGV2U291cmNlbWFwOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnLFxuICAgICAgICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHNjc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAaW1wb3J0IFwiQC9wdWJsaWMvYXNzZXRzL3Njc3MvbWF0ZXJpYWwtZGFzaGJvYXJkL192YXJpYWJsZXMuc2Nzc1wiO2AsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIERlZmluZSBnbG9iYWwgY29uc3RhbnRzXG4gICAgICAgIGRlZmluZToge1xuICAgICAgICAgICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uKSxcbiAgICAgICAgICAgIF9fQlVJTERfVElNRV9fOiBKU09OLnN0cmluZ2lmeShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLFxuICAgICAgICB9LFxuICAgICAgICAvLyBEZXBlbmRlbmN5IG9wdGltaXphdGlvblxuICAgICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgICAgIGluY2x1ZGU6IFsndnVlJywgJ3Z1ZS1yb3V0ZXInLCAncGluaWEnLCAnYXhpb3MnXSxcbiAgICAgICAgICAgIGV4Y2x1ZGU6IFsnQHZ1ZXVzZS9jb3JlJ11cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiJdLAogICJtYXBwaW5ncyI6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
