const fs = require("node:fs/promises");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const productionCacheDirectory = path.join(
  projectDirectory,
  ".next",
  "cache",
);

async function cleanNextBuildCache() {
  await fs.rm(productionCacheDirectory, { recursive: true, force: true });
  console.log("Next.js production build cache cleared.");
}

cleanNextBuildCache().catch((error) => {
  console.error("Could not clear the Next.js production build cache:", error);
  process.exitCode = 1;
});
