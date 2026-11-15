import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [react(), wasm()],
  root: "web",
  server: { port: 5173 },
  build: { outDir: "../dist", emptyOutDir: true, target: "esnext" },
});