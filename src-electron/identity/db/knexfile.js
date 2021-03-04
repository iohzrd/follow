const path = require("path");
const { app } = require("electron");
const fs = require("fs-extra");
const app_data_path = path.join(app.getPath("appData"), "follow");
if (!fs.existsSync(app_data_path)) {
  fs.mkdirSync(app_data_path);
}

const knexConfig = (filename) => {
  return {
    client: "sqlite3",
    // debug: process.env.DEV,
    debug: false,
    useNullAsDefault: true,
    connection: {
      filename: path.join(app_data_path, `${filename}.db`),
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb);
      },
    },
  };
};

module.exports = knexConfig;
