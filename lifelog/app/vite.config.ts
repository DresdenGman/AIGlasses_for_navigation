import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and relative asset paths in production.
export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  server: { port: 5273, strictPort: true },
  build: { target: "es2021", outDir: "dist" },
});
