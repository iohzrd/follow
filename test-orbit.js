const IpfsHttpClient = require("ipfs-http-client");
const ipfs = IpfsHttpClient();
const Orbit = require("orbit_");

async function main() {
  try {
    const { id } = await ipfs.id();
    const orbit = new Orbit(ipfs);

    orbit.events.on("connected", () => {
      for (let index = 0; index < 62; index++) {
        const channelName = `test-channel-${index}`;
        orbit.join(channelName);
      }
    });

    orbit.events.on("joined", channelName => {
      orbit.send(channelName, "ping");
      console.log(`Joined: ${channelName}`);
    });

    orbit.events.on("entry", (entry, channelName) => {
      const post = entry.payload.value;
      console.log(`[${post.meta.ts}] - ${channelName} - ${post.content}`);
    });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
}
main();
