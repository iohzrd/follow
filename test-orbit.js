const IpfsHttpClient = require("ipfs-http-client");
const ipfs = IpfsHttpClient();
const Orbit = require("orbit_");

async function main() {
  try {
    const { id } = await ipfs.id();
    const orbit = new Orbit(ipfs);

    orbit.events.on("connected", () => {
      orbit.join("channel1");
    });

    // Listen for new messages
    orbit.events.on("entry", (entry, channelName) => {
      const post = entry.payload.value;
      console.log("post");
      console.log(post);
      console.log(channelName);
      orbit.send(channelName, "pong");
    });

    orbit.events.on("joined", channelName => {
      console.log("orbit.channels");
      orbit.send(channelName, "ping");
      console.log(`-!- Joined # ${channelName}`);
    });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
}
main();
