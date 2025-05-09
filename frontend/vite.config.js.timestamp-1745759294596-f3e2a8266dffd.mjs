// vite.config.js
import { defineConfig, loadEnv } from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import vueDevTools from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "path";
var __vite_injected_original_dirname = "/home/admin/dev/lx-annotate/frontend";
var __vite_injected_original_import_meta_url = "file:///home/admin/dev/lx-annotate/frontend/vite.config.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: mode === "development" ? "http://localhost:3000/" : "./",
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools()
    ],
    build: {
      manifest: mode === "production" ? "manifest.json" : false,
      outDir: resolve(__vite_injected_original_dirname, "../static/dist"),
      rollupOptions: {
        input: {
          "main": resolve(__vite_injected_original_dirname, "src/main.ts")
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]"
        }
      }
    },
    server: {
      cors: true,
      port: 3e3,
      hmr: {
        host: "localhost"
      },
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "")
        }
      }
    },
    resolve: {
      alias: {
        "src": resolve(__vite_injected_original_dirname, "src"),
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FkbWluL2Rldi9seC1hbm5vdGF0ZS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCc7XG5pbXBvcnQgdnVlRGV2VG9vbHMgZnJvbSAndml0ZS1wbHVnaW4tdnVlLWRldnRvb2xzJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gICAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYmFzZTogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyA/ICdodHRwOi8vbG9jYWxob3N0OjMwMDAvJyA6ICcuLycsXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHZ1ZSgpLFxuICAgICAgICAgICAgdnVlSnN4KCksXG4gICAgICAgICAgICB2dWVEZXZUb29scygpLFxuICAgICAgICBdLFxuICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgbWFuaWZlc3Q6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/ICdtYW5pZmVzdC5qc29uJyA6IGZhbHNlLFxuICAgICAgICAgICAgb3V0RGlyOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL3N0YXRpYy9kaXN0JyksXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgJ21haW4nOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9tYWluLnRzJyksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxuICAgICAgICAgICAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnW25hbWVdLltleHRdJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlcjoge1xuICAgICAgICAgICAgY29yczogdHJ1ZSxcbiAgICAgICAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICAgICAgICBobXI6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm94eToge1xuICAgICAgICAgICAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfQVBJX0JBU0VfVVJMLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAgICAgJ3NyYyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAgICAgICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjc3M6IHtcbiAgICAgICAgICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBzY3NzOiB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgQGltcG9ydCBcIkAvcHVibGljL2Fzc2V0cy9zY3NzL21hdGVyaWFsLWRhc2hib2FyZC9fdmFyaWFibGVzLnNjc3NcIjtgLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH07XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFIsU0FBUyxjQUFjLGVBQWU7QUFDcFUsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUNuQixPQUFPLGlCQUFpQjtBQUN4QixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGVBQWU7QUFMeEIsSUFBTSxtQ0FBbUM7QUFBdUksSUFBTSwyQ0FBMkM7QUFNak8sSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDdEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFNBQU87QUFBQSxJQUNILE1BQU0sU0FBUyxnQkFBZ0IsMkJBQTJCO0FBQUEsSUFDMUQsU0FBUztBQUFBLE1BQ0wsSUFBSTtBQUFBLE1BQ0osT0FBTztBQUFBLE1BQ1AsWUFBWTtBQUFBLElBQ2hCO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDSCxVQUFVLFNBQVMsZUFBZSxrQkFBa0I7QUFBQSxNQUNwRCxRQUFRLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsTUFDM0MsZUFBZTtBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0gsUUFBUSxRQUFRLGtDQUFXLGFBQWE7QUFBQSxRQUM1QztBQUFBLFFBQ0EsUUFBUTtBQUFBLFVBQ0osZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsUUFDcEI7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLFFBQ0QsTUFBTTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNILFFBQVE7QUFBQSxVQUNKLFFBQVEsSUFBSTtBQUFBLFVBQ1osY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLFVBQVUsRUFBRTtBQUFBLFFBQ2hEO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNMLE9BQU87QUFBQSxRQUNILE9BQU8sUUFBUSxrQ0FBVyxLQUFLO0FBQUEsUUFDL0IsS0FBSyxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxNQUN4RDtBQUFBLElBQ0o7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNELHFCQUFxQjtBQUFBLFFBQ2pCLE1BQU07QUFBQSxVQUNGLGdCQUFnQjtBQUFBLFFBQ3BCO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
