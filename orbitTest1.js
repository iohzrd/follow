// const fs = require("fs-extra")
const IpfsHttpClient = require('ipfs-http-client')
const ipfs = IpfsHttpClient()
const Orbit = require('orbit_')

async function main() {
    try {
        const { id } = await ipfs.id()
        const orbit = new Orbit(ipfs)

        const username = id
        const channel = 'QmUsHMBjzxGMJy19d9XUNHKRQ21eUNsRAdAa8VMrJbQowJ_comments'

        orbit.events.on('connected', () => {
            console.log(`-!- Orbit connected`)
            orbit.join(channel)
        })

        orbit.events.on('joined', channelName => {
            orbit.send(channelName, '/me is now caching this channel')
            console.log(`-!- Joined #${channelName}`)
        })

        // Listen for new messages
        orbit.events.on('entry', (entry, channelName) => {
            const post = entry.payload.value
            console.log(`${post.meta.ts} - ${post.meta.from.name} - ${post.content} - ${channelName}`)
        })

        // Connect to Orbit network
        orbit.connect(username).catch(e => console.error(e))
    } catch (error) {
        console.log(error)
    }

}
main()