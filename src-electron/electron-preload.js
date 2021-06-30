import { contextBridge, ipcRenderer } from "electron";
import FileType from "file-type";

const validChannels = [
  "add-comment",
  "add-post",
  "edit-identity",
  "follow",
  "get-comments-newer-than",
  "get-comments-newest",
  "get-comments-older-than",
  "get-feed",
  "get-feed-newer-than",
  "get-feed-older-than",
  "get-identities",
  "get-identity",
  "get-ipfs_id",
  "get-post",
  "get-posts",
  "get-posts-newer-than",
  "get-posts-older-than",
  "identities",
  "identity",
  "ipfs_id",
  "publish-identity",
  "remove-post",
  "repost",
  "unfollow",
  "update-feed",
  "update-following",
];
contextBridge.exposeInMainWorld("ipc", {
  getFileTypeFromBuffer: async (buf) => {
    return await FileType.fromBuffer(buf);
  },
  invoke: async (channel, arg1, arg2, arg3, arg4, arg5) => {
    return await ipcRenderer.invoke(channel, arg1, arg2, arg3, arg4, arg5);
  },
  send: (channel, data) => {
    if (validChannels.includes(channel)) {
      console.log("ipc.send...");
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    if (validChannels.includes(channel)) {
      // Strip event as it includes `sender` and is a security risk
      console.log("ipc.on...");
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  once: (channel, callback) => {
    if (validChannels.includes(channel)) {
      console.log("ipc.once...");
      const newCallback = (_, data) => callback(data);
      ipcRenderer.once(channel, newCallback);
    }
  },
  removeListener: (channel, callback) => {
    if (validChannels.includes(channel)) {
      console.log("ipc.removeListener...");
      ipcRenderer.removeListener(channel, callback);
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      console.log("ipc.removeAllListeners...");
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
