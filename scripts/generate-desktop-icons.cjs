const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const assetsDirectory = path.join(projectDirectory, "assets");
const logoPath = path.join(projectDirectory, "public", "homeflow-logo.png");
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "homeflow-icons-"),
);

const iconRepresentations = [
  { size: 16, type: "icp4" },
  { size: 32, type: "icp5" },
  { size: 64, type: "icp6" },
  { size: 128, type: "ic07" },
  { size: 256, type: "ic08" },
  { size: 512, type: "ic09" },
  { size: 1024, type: "ic10" },
];

function createIcnsChunk(type, data) {
  const chunk = Buffer.alloc(8 + data.length);
  chunk.write(type, 0, 4, "ascii");
  chunk.writeUInt32BE(chunk.length, 4);
  data.copy(chunk, 8);
  return chunk;
}

function generateDesktopIcons() {
  fs.mkdirSync(assetsDirectory, { recursive: true });
  fs.copyFileSync(logoPath, path.join(assetsDirectory, "homeflow.png"));

  const icoResult = spawnSync(
    "sips",
    [
      "-z",
      "256",
      "256",
      "-s",
      "format",
      "ico",
      logoPath,
      "--out",
      path.join(assetsDirectory, "homeflow.ico"),
    ],
    { stdio: "ignore" },
  );

  if (icoResult.error || icoResult.status !== 0) {
    throw new Error(
      "Desktop icon regeneration requires the macOS sips command.",
    );
  }

  const chunks = iconRepresentations.map(({ size, type }) => {
    const outputPath = path.join(temporaryDirectory, `${size}.png`);
    const result = spawnSync(
      "sips",
      ["-z", String(size), String(size), logoPath, "--out", outputPath],
      { stdio: "ignore" },
    );

    if (result.error || result.status !== 0) {
      throw new Error(
        "Desktop icon regeneration requires the macOS sips command.",
      );
    }

    return createIcnsChunk(type, fs.readFileSync(outputPath));
  });
  const icnsLength = 8 + chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(icnsLength, 4);

  fs.writeFileSync(
    path.join(assetsDirectory, "homeflow.icns"),
    Buffer.concat([header, ...chunks], icnsLength),
  );
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  console.log("Desktop icons generated in assets/.");
}

try {
  generateDesktopIcons();
} catch (error) {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
