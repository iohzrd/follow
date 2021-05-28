const fs = require("fs-extra");
const { create } = require("ipfs-http-client");
const ipfs = create();

const handleComment = (msg) => {
  console.log("New comment...");
  // open file...
  const filePath = "comments.json";
  if (!fs.existsSync(filePath)) {
    const initObj = { comments: [] };
    fs.writeFileSync(filePath, JSON.stringify(initObj));
  }
  const raw = fs.readFileSync(filePath);
  const commentsFile = JSON.parse(raw);
  try {
    const json = new TextDecoder().decode(msg.data);
    const comment = JSON.parse(json);
    // TODO: ID blacklist...
    // TODO: global cooldown...
    // TODO: per "from" cooldown...
    // validate fields...
    if (
      typeof comment === "object" &&
      typeof comment.ts === "number" &&
      typeof comment.msg === "string" &&
      comment.msg.length > 0
    ) {
      // loose time validation...
      // exlcude messages that are more than a 1m different from now
      const delta = Math.abs(comment.ts - Math.floor(new Date().getTime()));
      if (delta < 60 * 1000) {
        comment.from = msg.from;
        // filter duplicates
        if (
          !commentsFile.comments.some(
            (existingComment) =>
              existingComment.msg === comment.msg &&
              existingComment.from === comment.from
          )
        ) {
          console.log(comment);
          commentsFile.comments.push(comment);
          fs.writeFileSync(filePath, JSON.stringify(commentsFile));
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};

async function main(topic, msg) {
  const ts = Math.floor(new Date().getTime());
  const msgObj = { ts: ts, msg: msg };
  await ipfs.pubsub.publish(topic, JSON.stringify(msgObj));
  await ipfs.pubsub.subscribe(topic, handleComment);
}
main("QmUsHMBjzxGMJy19d9XUNHKRQ21eUNsRAdAa8VMrJbQowJ", "asdf");
