const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell,
  utilityProcess,
} = require("electron");

const DEVELOPMENT_URL =
  process.env.HOMEFLOW_DESKTOP_URL || "http://127.0.0.1:3000";
const ALLOWED_EXTERNAL_HOSTS = new Set(["github.com"]);

let applicationOrigin = "";
let applicationUrl = "";
let isQuitting = false;
let mainWindow = null;
let nextServer = null;

const PERSISTED_SETTING_KEYS = new Set([
  "homeflow.activeMonth",
  "homeflow.activeMonth.real",
  "homeflow.activeMonth.demo",
  "homeflow.currency",
  "homeflow.dataMode",
  "homeflow.language",
  "homeflow.theme",
]);

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getSettingsPath(), "utf8"));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          PERSISTED_SETTING_KEYS.has(key) && typeof value === "string",
      ),
    );
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(
    getSettingsPath(),
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8",
  );
}

function assertPersistedSetting(key, value) {
  if (!PERSISTED_SETTING_KEYS.has(key) || typeof value !== "string") {
    throw new Error("Invalid HomeFlow setting.");
  }
}

ipcMain.handle("homeflow-settings:get", () => readSettings());
ipcMain.handle("homeflow-settings:set", (_event, key, value) => {
  assertPersistedSetting(key, value);
  const settings = readSettings();
  settings[key] = value;
  writeSettings(settings);
});
ipcMain.handle("homeflow-settings:remove", (_event, key) => {
  if (!PERSISTED_SETTING_KEYS.has(key)) {
    throw new Error("Invalid HomeFlow setting.");
  }

  const settings = readSettings();
  delete settings[key];
  writeSettings(settings);
});

function parseDevelopmentUrl() {
  const url = new URL(DEVELOPMENT_URL);
  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  if (url.protocol !== "http:" || !isLoopback) {
    throw new Error("HOMEFLOW_DESKTOP_URL must use HTTP on localhost.");
  }

  return url.toString();
}

function isApplicationUrl(rawUrl) {
  try {
    return new URL(rawUrl).origin === applicationOrigin;
  } catch {
    return false;
  }
}

function isAllowedExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function openAllowedExternalUrl(rawUrl) {
  if (!isAllowedExternalUrl(rawUrl)) return;

  void shell.openExternal(rawUrl).catch((error) => {
    console.error("Could not open external URL:", error);
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local port."));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The standalone server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error("The embedded HomeFlow server did not start in time.");
}

async function startStandaloneServer() {
  const standaloneDirectory = path.join(process.resourcesPath, "standalone");
  const serverEntryPoint = path.join(standaloneDirectory, "server.js");

  if (!fs.existsSync(serverEntryPoint)) {
    throw new Error(
      "The Next.js standalone build is missing. Run npm run desktop:build first.",
    );
  }

  const port = await getAvailablePort();
  const url = `http://127.0.0.1:${port}`;
  const configuredDataDirectory = process.env.HOMEFLOW_DATA_DIR?.trim();
  const dataDirectory = configuredDataDirectory
    ? path.resolve(configuredDataDirectory)
    : path.join(app.getPath("userData"), "data");

  nextServer = utilityProcess.fork(serverEntryPoint, [], {
    cwd: standaloneDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      HOMEFLOW_DATA_DIR: dataDirectory,
    },
    serviceName: "HomeFlow Server",
    stdio: "inherit",
  });

  nextServer.once("exit", (code) => {
    nextServer = null;

    if (!isQuitting) {
      dialog.showErrorBox(
        "HomeFlow",
        `The embedded server stopped unexpectedly (code ${code ?? "unknown"}).`,
      );
      app.quit();
    }
  });

  await waitForServer(url);
  return url;
}

async function createMainWindow(url) {
  applicationOrigin = new URL(url).origin;
  const windowIcon = app.isPackaged
    ? path.join(process.resourcesPath, "homeflow-logo.png")
    : path.join(app.getAppPath(), "public", "homeflow-logo.png");

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 700,
    show: false,
    icon: windowIcon,
    backgroundColor: "#f4f5f7",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: requestedUrl }) => {
    openAllowedExternalUrl(requestedUrl);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, requestedUrl) => {
    if (isApplicationUrl(requestedUrl)) return;

    event.preventDefault();
    openAllowedExternalUrl(requestedUrl);
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.once("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(url);
}

async function prepareApplicationSession() {
  const applicationSession = session.defaultSession;

  applicationSession.setPermissionCheckHandler(() => false);
  applicationSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );

  if (app.isPackaged) {
    await Promise.all([
      applicationSession.clearCache(),
      applicationSession.clearCodeCaches({}),
    ]);
  }
}

async function startApplication() {
  await prepareApplicationSession();

  applicationUrl = app.isPackaged
    ? await startStandaloneServer()
    : parseDevelopmentUrl();

  await createMainWindow(applicationUrl);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    nextServer?.kill();
    nextServer = null;
  });

  app.on("window-all-closed", () => app.quit());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && applicationUrl) {
      void createMainWindow(applicationUrl);
    }
  });

  app.whenReady().then(startApplication).catch((error) => {
    console.error(error);
    dialog.showErrorBox("HomeFlow", error instanceof Error ? error.message : String(error));
    app.quit();
  });
}
