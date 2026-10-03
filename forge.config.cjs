const fs = require("node:fs/promises");
const path = require("node:path");
const packageMetadata = require("./package.json");

const description = "Private, local-first personal finance tracking.";
const homepage = "https://github.com/abujalancej/homeflow";
const platformOutputDirectory =
  process.platform === "darwin"
    ? "out/mac"
    : process.platform === "win32"
      ? "out/win"
      : "out/linux";
const desktopIcon =
  process.platform === "darwin"
    ? path.join(__dirname, "assets", "homeflow.icns")
    : process.platform === "win32"
      ? path.join(__dirname, "assets", "homeflow.ico")
      : path.join(__dirname, "assets", "homeflow.png");
const artifactPlatformNames = {
  darwin: "mac",
  linux: "linux",
  mas: "mac",
  win32: "win",
};

async function standardizeArtifactNames(_forgeConfig, makeResults) {
  for (const result of makeResults) {
    result.artifacts = await Promise.all(
      result.artifacts.map(async (artifactPath) => {
        const extension = path.extname(artifactPath).toLowerCase();
        if (![".dmg", ".exe", ".zip"].includes(extension)) {
          return artifactPath;
        }

        const platform = artifactPlatformNames[result.platform] ?? result.platform;
        const filename = `${packageMetadata.productName}-${packageMetadata.version}-${platform}-${result.arch}${extension}`;
        const destination = path.join(path.dirname(artifactPath), filename);
        if (artifactPath === destination) {
          return artifactPath;
        }

        await fs.rm(destination, { force: true });
        await fs.rename(artifactPath, destination);
        return destination;
      }),
    );
  }

  return makeResults;
}

module.exports = {
  outDir: platformOutputDirectory,
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
      /^\/release($|\/)/,
      /^\/scripts($|\/)/,
      /^\/src($|\/)/,
      /^\/(?:\.gitignore|\.nvmrc|AGENTS\.md|README(?:\.[a-z]+)?\.md)$/,
      /^\/(?:eslint|next|postcss)\.config\.(?:cjs|mjs|ts)$/,
      /^\/(?:forge\.config\.cjs|next-env\.d\.ts|package-lock\.json|tsconfig(?:\.tsbuildinfo|\.json))$/,
    ],
  },
  rebuildConfig: {},
  hooks: {
    postMake: standardizeArtifactNames,
  },
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
