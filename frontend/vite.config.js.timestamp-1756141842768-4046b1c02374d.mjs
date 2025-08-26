// vite.config.js
import { defineConfig, loadEnv } from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///home/admin/dev/lx-annotate/frontend/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import vueDevTools from "file:///home/admin/dev/lx-annotate/frontend/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
var __vite_injected_original_import_meta_url = "file:///home/admin/dev/lx-annotate/frontend/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: mode === "development" ? "http://localhost:3000/" : "./",
    plugins: [vue(), vueJsx(), vueDevTools()],
    build: {
      manifest: mode === "production" ? "manifest.json" : false,
      outDir: resolve(__dirname, "../static/dist"),
      target: "esnext",
      // Ermöglicht Top-level await
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/main.ts")
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
          format: "es"
          // ES-Module Format für moderne Features
        }
      }
    },
    esbuild: {
      target: "esnext"
      // Unterstützt moderne JS-Features inklusive Top-level await
    },
    server: {
      cors: true,
      port: 5173,
      // Ändere den Port, um Konflikte mit Django zu vermeiden
      hmr: { host: "localhost" },
      proxy: {
        // Leite alle API-Requests an Django weiter
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false
        },
        // Zusätzliche Endpunkte falls nötig
        "/admin": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false
        },
        "/static": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
        // one alias is enough
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FkbWluL2Rldi9seC1hbm5vdGF0ZS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hZG1pbi9kZXYvbHgtYW5ub3RhdGUvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCc7XG5pbXBvcnQgdnVlRGV2VG9vbHMgZnJvbSAndml0ZS1wbHVnaW4tdnVlLWRldnRvb2xzJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJzsgLy8gXHUyMTkwIGFkZCBkaXJuYW1lXG4vLyAtLS0tIG1ha2UgdGhlIENvbW1vbkpTLXN0eWxlIGdsb2JhbHMgLS0tLS0tLS0tLS0tLS0tLS0tLVxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IGRpcm5hbWUoX19maWxlbmFtZSk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAgIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGJhc2U6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcgPyAnaHR0cDovL2xvY2FsaG9zdDozMDAwLycgOiAnLi8nLFxuICAgICAgICBwbHVnaW5zOiBbdnVlKCksIHZ1ZUpzeCgpLCB2dWVEZXZUb29scygpXSxcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG1hbmlmZXN0OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAnbWFuaWZlc3QuanNvbicgOiBmYWxzZSxcbiAgICAgICAgICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zdGF0aWMvZGlzdCcpLFxuICAgICAgICAgICAgdGFyZ2V0OiAnZXNuZXh0JywgLy8gRXJtXHUwMEY2Z2xpY2h0IFRvcC1sZXZlbCBhd2FpdFxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgICAgIG1haW46IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL21haW4udHMnKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnW25hbWVdLmpzJyxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdbbmFtZV0uW2V4dF0nLFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICdlcycsIC8vIEVTLU1vZHVsZSBGb3JtYXQgZlx1MDBGQ3IgbW9kZXJuZSBGZWF0dXJlc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBlc2J1aWxkOiB7XG4gICAgICAgICAgICB0YXJnZXQ6ICdlc25leHQnLCAvLyBVbnRlcnN0XHUwMEZDdHp0IG1vZGVybmUgSlMtRmVhdHVyZXMgaW5rbHVzaXZlIFRvcC1sZXZlbCBhd2FpdFxuICAgICAgICB9LFxuICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICAgIGNvcnM6IHRydWUsXG4gICAgICAgICAgICBwb3J0OiA1MTczLCAvLyBcdTAwQzRuZGVyZSBkZW4gUG9ydCwgdW0gS29uZmxpa3RlIG1pdCBEamFuZ28genUgdmVybWVpZGVuXG4gICAgICAgICAgICBobXI6IHsgaG9zdDogJ2xvY2FsaG9zdCcgfSxcbiAgICAgICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAgICAgLy8gTGVpdGUgYWxsZSBBUEktUmVxdWVzdHMgYW4gRGphbmdvIHdlaXRlclxuICAgICAgICAgICAgICAgICcvYXBpJzoge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjgwMDAnLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBadXNcdTAwRTR0emxpY2hlIEVuZHB1bmt0ZSBmYWxscyBuXHUwMEY2dGlnXG4gICAgICAgICAgICAgICAgJy9hZG1pbic6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo4MDAwJyxcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJy9zdGF0aWMnOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksIC8vIG9uZSBhbGlhcyBpcyBlbm91Z2hcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNzczoge1xuICAgICAgICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHNjc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAaW1wb3J0IFwiQC9wdWJsaWMvYXNzZXRzL3Njc3MvbWF0ZXJpYWwtZGFzaGJvYXJkL192YXJpYWJsZXMuc2Nzc1wiO2AsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4UixTQUFTLGNBQWMsZUFBZTtBQUNwVSxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8saUJBQWlCO0FBQ3hCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsU0FBUyxlQUFlO0FBTCtJLElBQU0sMkNBQTJDO0FBT2pPLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFVBQVU7QUFFcEMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDdEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFNBQU87QUFBQSxJQUNILE1BQU0sU0FBUyxnQkFBZ0IsMkJBQTJCO0FBQUEsSUFDMUQsU0FBUyxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsWUFBWSxDQUFDO0FBQUEsSUFDeEMsT0FBTztBQUFBLE1BQ0gsVUFBVSxTQUFTLGVBQWUsa0JBQWtCO0FBQUEsTUFDcEQsUUFBUSxRQUFRLFdBQVcsZ0JBQWdCO0FBQUEsTUFDM0MsUUFBUTtBQUFBO0FBQUEsTUFDUixlQUFlO0FBQUEsUUFDWCxPQUFPO0FBQUEsVUFDSCxNQUFNLFFBQVEsV0FBVyxhQUFhO0FBQUEsUUFDMUM7QUFBQSxRQUNBLFFBQVE7QUFBQSxVQUNKLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQjtBQUFBLFVBQ2hCLFFBQVE7QUFBQTtBQUFBLFFBQ1o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsUUFBUTtBQUFBO0FBQUEsSUFDWjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBO0FBQUEsTUFDTixLQUFLLEVBQUUsTUFBTSxZQUFZO0FBQUEsTUFDekIsT0FBTztBQUFBO0FBQUEsUUFFSCxRQUFRO0FBQUEsVUFDSixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDWjtBQUFBO0FBQUEsUUFFQSxVQUFVO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDWjtBQUFBLFFBQ0EsV0FBVztBQUFBLFVBQ1AsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFFBQ1o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsT0FBTztBQUFBLFFBQ0gsS0FBSyxRQUFRLFdBQVcsS0FBSztBQUFBO0FBQUEsTUFDakM7QUFBQSxJQUNKO0FBQUEsSUFDQSxLQUFLO0FBQUEsTUFDRCxxQkFBcUI7QUFBQSxRQUNqQixNQUFNO0FBQUEsVUFDRixnQkFBZ0I7QUFBQSxRQUNwQjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
