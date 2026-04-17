import { defineConfig } from "tsup";
import { copyFileSync } from "fs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "react-markdown", "remark-gfm"],
  onSuccess: async () => {
    copyFileSync("src/styles/possession.css", "dist/possession.css");
  },
});
