import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { compression } from "vite-plugin-compression2";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

function pdfAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve("pdfjs-dist/package.json"));
  const { version } = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8")
  );
  const assets = new Map<string, Buffer>();
  for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    for (const file of readdirSync(join(root, folder))) {
      assets.set(
        `pdfjs/${version}/${folder}/${file}`,
        readFileSync(join(root, folder, file))
      );
    }
  }
  assets.set(`pdfjs/${version}/LICENSE`, readFileSync(join(root, "LICENSE")));
  return {
    name: "local-pdf-assets",
    buildStart() {
      for (const [fileName, source] of assets)
        this.emitFile({ type: "asset", fileName, source });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const key = (req.url || "").split("?")[0].replace(/^\//, "");
        const asset = assets.get(key);
        if (!asset) return next();
        res.setHeader(
          "Content-Type",
          key.endsWith(".js")
            ? "application/javascript"
            : "application/octet-stream"
        );
        res.end(asset);
      });
    },
  };
}

const plugins = [
  pdfAssets(),
  vue(),
  VueI18nPlugin({
    include: [`${import.meta.dirname}/src/i18n/**/*.json`],
  }),
  compression({ include: /\.js$/, deleteOriginalAssets: false }),
];

const resolve = {
  alias: {
    // vue: "@vue/compat",
    "@/": `${import.meta.dirname}/src/`,
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  if (command === "serve") {
    return {
      plugins,
      resolve,
      server: {
        proxy: {
          "/api/command": {
            target: "ws://127.0.0.1:8080",
            ws: true,
          },
          "/api": "http://127.0.0.1:8080",
        },
      },
    };
  } else {
    // command === 'build'
    return {
      plugins,
      resolve,
      base: "",
      build: {
        modulePreload: false,
        rollupOptions: {
          input: {
            index: `${import.meta.dirname}/public/index.html`,
          },
          output: {
            manualChunks: (id) => {
              // bundle dayjs files in a single chunk
              // this avoids having small files for each locale
              if (id.includes("dayjs/")) {
                return "dayjs";
                // bundle i18n in a separate chunk
              } else if (id.includes("i18n/")) {
                return "i18n";
              }
            },
          },
        },
      },
      experimental: {
        renderBuiltUrl(filename, { hostType }) {
          if (hostType === "js") {
            return { runtime: `window.__prependStaticUrl("${filename}")` };
          } else if (hostType === "html") {
            return `[{[ .StaticURL ]}]/${filename}`;
          } else {
            return { relative: true };
          }
        },
      },
    };
  }
});
