import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [wasm(), react()],
  build: { target: "esnext" },
  optimizeDeps: { exclude: ["@midnightntwrk/onchain-runtime-v4", "@midnight-ntwrk/compact-runtime"], esbuildOptions: { target: "esnext" } },
});
