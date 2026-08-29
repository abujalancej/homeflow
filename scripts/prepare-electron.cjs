const fs = require("node:fs/promises");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const nextDirectory = path.join(projectDirectory, ".next");
const standaloneDirectory = path.join(nextDirectory, "standalone");

async function copyDirectory(source, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true, force: true });
}

async function prepareElectronBuild() {
  await fs.access(path.join(standaloneDirectory, "server.js"));

  try {
    const tracedDataFiles = await fs.readdir(
      path.join(standaloneDirectory, "data"),
    );

    if (tracedDataFiles.length > 0) {
      throw new Error(
        "The standalone build contains local data files and cannot be packaged.",
      );
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  await Promise.all([
    copyDirectory(
      path.join(projectDirectory, "public"),
      path.join(standaloneDirectory, "public"),
    ),
    copyDirectory(
      path.join(nextDirectory, "static"),
      path.join(standaloneDirectory, ".next", "static"),
    ),
  ]);

  console.log("Electron standalone resources prepared.");
}

prepareElectronBuild().catch((error) => {
  console.error("Could not prepare the Electron build:", error);
  process.exitCode = 1;
});
