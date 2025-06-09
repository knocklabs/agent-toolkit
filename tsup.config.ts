import { defineConfig } from "tsup";

import { name, version } from "./package.json";

export default defineConfig((overrideOptions) => {
  const isProd = overrideOptions.env?.NODE_ENV === "production";

  return {
    entry: [
      "src/ai-sdk/index.ts",
      "src/openai/index.ts",
      "src/langchain/index.ts",
      "src/mastra/index.ts",
      "src/modelcontextprotocol/index.ts",
      "src/modelcontextprotocol/local-server.ts",
      "src/types.ts",
      "src/human-in-the-loop.ts",
    ],
    dts: true,
    clean: true,
    bundle: true,
    sourcemap: true,
    format: "esm",
    define: {
      PACKAGE_NAME: `"${name}"`,
      PACKAGE_VERSION: `"${version}"`,
      __DEV__: `${!isProd}`,
    },
    esbuildOptions(options) {
      options.alias = {
        "@": "./src",
      };
    },
  };
});
