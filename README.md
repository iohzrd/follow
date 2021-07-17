# Follow

Decentralized, censorship resistant social media on IPFS and TOR

## Status

Alpha

![screenshot1](screenshot1.png)
![screenshot2](screenshot2.png)

## Warnings

This app will override anything you've previously published to your IPFS id (via IPNS)
merging planned for future...

Also, this app will probably break frequently for the foreseeable future so don't get attached to your posts just yet ;)

If a breaking change occurs, try deleting your SQLite database in electrons "user data" directory.

on windows:

```
C:\Users\<USER>\AppData\Roaming\follow\<IPFS-ID>.db
```

on linux:

```
/home/<USER>/.config/follow/<IPFS-ID>.db
```

## Architecture

The core of follow is it's concept of an identity.

The identity object is where data about the users posts, the people they "follow", and whatever else they might want to include is stored.

An identity object is the fundamental unit that we'll use to create a distributed social graph.

First, we connect to IPFS and retrieve our ID.

On first boot, we instantiate a new "Identity" object, which is ultimately saved to disk via SQLite.

Most of the identity logic is contained in:
`src-electron/identity/index.js`

Identity object structure:

root level keys:

```
{
    "aux": [{key: "", value: ""}], // a list for arbitrary, user-defined data.
    "av": "", // base64 encoded image or ipfs CID for "avatar"
    "dn": "", // user-defined display name
    "following": [""], // a list of ID's the user follows
    "hs": "", // users TOR HIDDEN SERVICE address
    "meta": [""], // list of CIDs that represent meta objects
    "posts": [""], // a list of CIDs that represent post objects
    "publisher": "", // users IPNS ID
    "ts": 1608271880058, // UTC adjusted UNIX timestamp of the identities last alteration
}
```

identity aux object:

```
[
    {key: "btc", value: "1T8mM7TDWBcxKF5ZZy7B58adMsBgxivr1"}
]
```

identity meta object:

```
[
    {"TODO": ""}
]
```

post object:

```
{
    "aux": [{key: "", value: ""}], // an array for arbitrary, user-defined data. Ex.
    "body": "", // the text body of the post
    "files": [], // a list of file paths, relative to the post root
    "filesRoot": "", // IPFS CID of the root directory of the post
    "magnet": "", // a webtorrent magnet link for redundancy
    "meta": [""], // list of CIDs that represent meta objects
    "publisher": "", // original publisher, will be used for "re-post" functionality
    "ts": 1608271880058 // UTC adjusted UNIX timestamp of the post
}
```

post aux object:

```
[
    {key: "alternative_link1", value: "example.com"}
]
```

post meta object:

```
[
    {"TODO": ""}
]
```

We cache every post (user and following) object and "post body"(text) to disk for faster load times, and we automatically pin post CIDs to strengthen the network. ID caches follow a strict directory structure.

Once an identity object has been generated and saved to disk, it is "uploaded" and "pinned" via IPFS.
Then, in an attempt to abide by unix philosophy, we publish the identity CID to IPNS wrapped in a directory, so other things can be stored there as well.

TODO: recursively merge new publication with the "root directory" of previously published record.

The users identity object CID can now be retrieved by querying IPNS with their ID and the object itself can be downloaded.

Once a user "follows" another user, the process of fetching their posts is done automatically. The posts are presented chronologically in a "feed" with the all posts from all the other ID's the user follows.

Identity objects _will_ be automatically re-fetched periodically, followed by their new posts.

We also serve the identity object via a tor hidden service for extra censorship resistance.

## How to run

Node.js >=10 is required.

```
yarn global add @quasar/cli
# or
npm install -g @quasar/cli

git clone git@github.com:iohzrd/follow.git
cd follow
npm install
npm start
```

## TODO

- [x] prototype logic
- [x] periodically re-publish self identity
- [x] periodically update identities you follow...
- [x] cache posts
- [x] enable file in posts
- [x] bundle IPFS binaries and manage execution
- [x] "re-post" / mirror a post
- [x] per post comments via pubsub / orbit
- [x] post view
- [x] include index.html with posts to allow styling for browser consumption...
- [x] implement tray.
- [x] Migrate core logic to use IPC...
- [x] progress events for spinners and such
- [x] Distribute binaries
- [x] TOR integration (serve identity. TODO retrieve content)
- [x] migrate to SQLite...
- [x] Paginate feed
- [x] enable(fix) audio/video playback
- [ ] follow via tor hidden service
- [ ] re-design comment system
- [ ] strip exif data from images
- [ ] System for curating comments
- [ ] Auto-update system
- [ ] serve web-frendly html with identity + TOR
- [ ] more progress spinners
- [ ] meta view ("playlists" / arbitrary user defined categorization)
- [ ] meta comment system (topic based bulletin board)
- [ ] advanced pin management
- [ ] settings view
- [ ] add banners to following view (amount of new posts etc...)
- [ ] "remix"(clone and modify) other users "playlists"...
- [ ] seed posts as web torrents (for redundancy)
- [ ] mechanism for exporting/importing identity / posts
- [ ] mobile app...
- [ ] keybase-like functionality...

## Follow me

```
12D3KooWDED1CudLX9sdi1qBzy5tHS4Xi2Mpk45E5wrqteri1R8z
```

and

```
Qmb4zrL17TtLGnaLFuUQC4TmaVbizEfVbDnnSzNLxkZ3Zp
```

## Support me

```
BTC:
1T8mM7TDWBcxKF5ZZy7B58adMsBgxivr1

XMR:
45TMU8YyJD7XCZXRGFUL3bGrgqnA2BrqWXbt9GTWGzCZ43e2fKBVowFintAzn5CsQA4S3MiHagCk22FP1L3meQJQF94PWE3
```

or

https://www.patreon.com/iohzrd

## License

[GPL-3.0 License](LICENSE)
