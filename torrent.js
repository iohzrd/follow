var WebTorrent = require("webtorrent-hybrid");
var client = new WebTorrent();

async function run() {
  const p = new Promise((resolve, reject) => {
    console.log("Initial");
    client.seed(
      filePath,
      function(torrent, err) {
        if (err) {
          reject(err);
        }
        resolve(torrent);
      }
    );
  });

  await p;
  console.log(r);
}
run();
