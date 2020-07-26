// const fs = require("fs-extra")
const IpfsHttpClient = require("ipfs-http-client");
const ipfs = IpfsHttpClient();
const Orbit = require("orbit_");

function test(arg) {
  const self = Boolean(arg);
  console.log(self);
}

async function main() {
  try {
    const { id } = await ipfs.id();
    console.log("id");
    console.log(id);

    const orbit = new Orbit(ipfs);
    console.log(orbit._options);

    const channel = "chat";

    orbit.events.on("connected", () => {
      console.log(`-!- Orbit connected`);
      orbit.join(channel);
    });

    orbit.events.on("joined", channelName => {
      orbit.send(channelName, `is now caching this channel`);
      console.log(`-!- Joined # ${channelName}`);
    });

    // Listen for new messages
    orbit.events.on("entry", (entry, channelName) => {
      const post = entry.payload.value;
      console.log("post");
      console.log(post);
      console.log(channelName);
    });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
  test();
}
main();
