import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const playgroundDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(playgroundDir, "..");

export default defineConfig({
  root: playgroundDir,
  resolve: {
    alias: {
      "@schedulespark/calendar": path.resolve(packageDir, "src/index.ts"),
      "@schedulespark/rrule": path.resolve(packageDir, "../rrule/src/index.ts")
    }
  },
  server: {
    open: true,
    port: 5174
  }
});
