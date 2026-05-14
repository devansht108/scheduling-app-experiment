const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["public/app.js"],
  bundle: true,
  outfile: "public/bundle.js",
  platform: "browser",
  format: "esm",
}).catch(() => process.exit(1));