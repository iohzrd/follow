const IpfsHttpClient = require("ipfs-http-client");
const ipfs = IpfsHttpClient();
const Orbit = require("orbit-core");

async function main() {
  try {
    const { id } = await ipfs.id();
    const orbit = new Orbit(ipfs);

    orbit.events.on("connected", () => {
      const channelName = "channel1";

      orbit.join(channelName).then(channel => {
        console.log("joined");
        // console.log(channel)

        channel.on("entry", entry => {
          // messages = [...messages, entry.payload.value].sort((a, b) => a.meta.ts - b.meta.ts)
          console.log("entry");
          // console.log(entry);
        });

        channel.on("ready", async () => {
          console.log(`${channelName} ready`);
          // const feed = orbit.channels[channelName].feed;
          // const all = feed
          //   .iterator({ limit: -1 })
          //   .collect()
          //   .map(e => e.payload.value);
          // console.log(all);
        });

        channel.load(-1);
      });
    });

    // const onJoinedChannel = async (channelName, channel) => {
    //   channel.on('ready', async () => {
    //     console.log(`${channelName} ready`)
    //     const feed = orbit.channels[channelName].feed
    //     const all = feed.iterator({ limit: -1 })
    //     .collect()
    //     .map((e) => e.payload.value.content)
    //     console.log(all)
    //   })

    //   // channel.on('entry', entry => {
    //   //   // messages = [...messages, entry.payload.value].sort((a, b) => a.meta.ts - b.meta.ts)
    //   //   console.log("entry")
    //   //   // console.log(entry.payload.value)
    //   // })

    //   channel.load(-1)
    // };

    // orbit.events.on('joined', onJoinedChannel)

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
}
main();
