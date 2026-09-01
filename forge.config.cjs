const path = require("node:path");

const description = "Private, local-first personal finance tracking.";
const homepage = "https://github.com/abujalancej/homeflow";
const desktopIcon =
  process.platform === "darwin"
    ? path.join(__dirname, "assets", "homeflow.icns")
    : process.platform === "win32"
      ? path.join(__dirname, "assets", "homeflow.ico")
      : path.join(__dirname, "assets", "homeflow.png");

module.exports = {
  packagerConfig: {
    appBundleId: "com.abujalancej.homeflow",
    appCategoryType: "public.app-category.finance",
    asar: true,
    icon: desktopIcon,
    extraResource: [
      path.join(__dirname, ".next", "standalone"),
      path.join(__dirname, "public", "homeflow-logo.png"),
    ],
    ignore: [
      /^\/\.next($|\/)/,
      /^\/\.gitea($|\/)/,
      /^\/assets($|\/)/,
      /^\/data($|\/)/,
      /^\/node_modules($|\/)/,
      /^\/out($|\/)/,
      /^\/public($|\/)/,
      /^\/scripts($|\/)/,
      /^\/src($|\/)/,
      /^\/(?:\.gitignore|\.nvmrc|AGENTS\.md|README(?:\.[a-z]+)?\.md)$/,
      /^\/(?:eslint|next|postcss)\.config\.(?:cjs|mjs|ts)$/,
      /^\/(?:forge\.config\.cjs|next-env\.d\.ts|package-lock\.json|tsconfig(?:\.tsbuildinfo|\.json))$/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "homeflow",
        authors: "abujalancej",
        description,
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        name: "HomeFlow",
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "win32", "linux"],
      config: {},
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        options: {
          categories: ["Office"],
          homepage,
          maintainer: "abujalancej",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      platforms: ["linux"],
      config: {
        options: {
          categories: ["Office"],
          homepage,
          license: "UNLICENSED",
        },
      },
    },
  ],
};
