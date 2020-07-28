const fs = require("fs-extra");
const IpfsHttpClient = require("ipfs-http-client");
const ipfs = IpfsHttpClient({
  host: "localhost",
  port: "5001",
  protocol: "http"
});

async function main() {
  const postObj = {
    body: "test2",
    cid: "",
    dn: "",
    files: [],
    magnet: "",
    meta: [],
    publisher: "",
    ts: Math.floor(new Date().getTime())
  };
  const indexHTML = await fs.readFile(
    "/home/iohzrd/src/personal/node/follow/src/modules/postStandalone.html"
  );
  const obj = [
    {
      path: "post.json",
      content: JSON.stringify(postObj)
    },
    {
      path: "index.html",
      content: indexHTML
    }
  ];
  const addOptions = {
    // pin: true,
    wrapWithDirectory: true,
    timeout: 10000
  };
  const addRet = await ipfs.add(obj, addOptions);
  console.log("addRet");
  console.log(addRet);
}
main();
