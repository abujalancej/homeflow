const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
  "homeflowDesktop",
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
    getSettings: () => ipcRenderer.invoke("homeflow-settings:get"),
    setSetting: (key, value) =>
      ipcRenderer.invoke("homeflow-settings:set", key, value),
    removeSetting: (key) => ipcRenderer.invoke("homeflow-settings:remove", key),
  }),
);
