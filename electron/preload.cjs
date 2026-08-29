const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
  "homeflowDesktop",
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
  }),
);
