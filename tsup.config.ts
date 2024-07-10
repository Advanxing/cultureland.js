import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    splitting: false,
    clean: true,
    dts: true,
    bundle: true,
    format: ["cjs", "esm"]
});