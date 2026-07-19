import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(rootDir, "src/background/background.ts"),
        content: resolve(rootDir, "src/content/youtube-content.ts"),
        popup: resolve(rootDir, "src/popup/popup.html"),
        options: resolve(rootDir, "src/options/options.html")
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
