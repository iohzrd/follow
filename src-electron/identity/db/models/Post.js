"use strict";

const { Model } = require("objection");

class Post extends Model {
  static get tableName() {
    return "posts";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "aux",
        "body",
        "files",
        "filesRoot",
        "magnet",
        "meta",
        "postCid",
        "publisher",
        "ts",
      ],

      properties: {
        aux: { type: "array" },
        body: { type: "string" },
        files: { type: "array" },
        filesRoot: { type: "string" },
        magnet: { type: "string" },
        meta: { type: "array" },
        postCid: { type: "string" },
        publisher: { type: "string" },
        ts: { type: "integer" },
      },
    };
  }
}

module.exports = Post;
