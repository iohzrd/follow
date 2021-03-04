"use strict";

const { Model } = require("objection");

class Comment extends Model {
  static get tableName() {
    return "comments";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["cid", "content", "from", "inReplyTo", "topic", "ts", "type"],

      properties: {
        cid: { type: "string" },
        content: { type: "string" },
        from: { type: "string" },
        inReplyTo: { type: "string" },
        topic: { type: "string" },
        ts: { type: "integer" },
        type: { type: "string" },
      },
    };
  }
}

module.exports = Comment;
