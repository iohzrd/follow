const os = require("os");
const packageJson = require("../../package.json");

module.exports = Object.freeze({
  IS_MAC: os.platform() === "darwin",
  IS_WIN: os.platform() === "win32",
  VERSION: packageJson.version,
  GO_IPFS_VERSION: packageJson.dependencies["go-ipfs"]
});
