# Follow

decentralized, censorship resistant publication and subscription (social media) on IPFS

## Status

Alpha

## Warnings

This app will override anything you've previously published to your IPFS id (via IPNS)
merging planned for future...

Also, this app will probably break frequently for the foreseeable future so don't get attached to your posts just yet ;)

If a breaking change occurs, try manually editing your identity object, stored in electrons "user data" directory

## Architecture

The core of follow is it's concept of an identity.

The identity object is where the data about the users posts, the people they "follow", and whatever else they might want to include is stored.

An identity object is the fundamental unit that we'll use to create a distributed social graph.

First, we connect to IPFS and retrieve our ID.

On first boot, we instantiate a new "Identity" object, which is ultimately saved to disk.

Most of the identity logic is contained in the Identity class:
`src/modules/identity.js`

Identity object structure:

root level keys:

```
{
    "aux": [{key: "", value: ""}], // an array for arbitrary, user-defined data. Ex.
    "av": "", // base64 encoded image data for "avatar"
    "dn": "", // user-defined display name
    "following": [""], // a list of ID's the user follows
    "hs": "", // users TOR HIDDEN SERVICE address
    "id": "", // users IPNS ID
    "meta": [""], // list of CIDs that represent meta objects
    "posts": [""], // a list of CIDs that represent post objects
    "ts": 10000, // UTC adjusted UNIX timestamp of the identities last edit
}
```

aux object:

```
{
    "btc": "",
    "website": ""
}
```

post object:

```
{
    "aux": [{key: "", value: ""}], // an array for arbitrary, user-defined data. Ex.
    "body": "", // the text body of the post
    "cid": "", // IPFS CID of the root directory of the post
    "files": [], // a list of file paths, relative to the post root
    "magnet": "", // a webtorrent magnet link for redundancy
    "meta": [""], // list of CIDs that represent meta objects
    "publisher": "", // original publisher, will be used for "re-post" functionality
    "ts": 0 // UTC adjusted UNIX timestamp of the post
}
```

meta object:

```
{
    "TODO": "" //
}
```

We cache every post (user and following) object and "post body"(text) to disk for faster load times, and we automatically pin post CIDs to strengthen the network. ID caches follow a strict directory structure.

Once an identity object has been generated and saved to disk, it is "uploaded" and "pinned" via IPFS.
Then, in an attempt to abide by unix philosophy, we publish the identity CID to IPNS wrapped in a directory, so other things can be stored there as well.

TODO: recursively merge new publication with the "root directory" of previously published record.

The users identity object CID can now be retrieved by querying IPNS with their ID and the object itself can be downloaded.

Once a user "follows" another user, the process of fetching their posts is done automatically. The posts are presented chronologically in a "feed" with the all posts from all the other ID's the user follows.

Identity objects _will_ be automatically re-fetched periodically, followed by their new posts.

## How to run

```
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
- [x] per post comments via pubsub
- [x] post view
- [x] include index.html with posts to allow styling for browser consumption...
- [x] implement tray.
- [x] Migrate core logic to use IPC...
- [x] progress events for spinners and such
- [x] TOR integration (serve identity. TODO retrieve content)
- [ ] Distribute binaries / Auto-update
- [ ] use SQLite for feed / posts...
- [ ] Paginate feed
- [ ] serve web-frendly html with identity + TOR
- [ ] more progress spinners
- [ ] meta view ("playlists" / arbitrary user defined categorization)
- [ ] meta comment system (topic based bulletin board)
- [ ] settings view
- [ ] add banners to following view (amount of new posts etc...)
- [ ] "remix"(clone and modify) other users "playlists"...
- [ ] seed posts as web torrents (for redundancy)
- [ ] sign posts (probably the list of CIDs or maybe body)
- [ ] keybase-like functionality...
- [ ] use IPLD

## Follow me

```
Qmb4zrL17TtLGnaLFuUQC4TmaVbizEfVbDnnSzNLxkZ3Zp
```

and

```
12D3KooWPPAV9MsQokpWnT3ufMoc8KDJrnEysBnwYW6pkbGEmzwa
```

## Shilling...

btc

```
1T8mM7TDWBcxKF5ZZy7B58adMsBgxivr1
```

or

https://www.patreon.com/iohzrd

## License

[GPLv3](LICENSE)
