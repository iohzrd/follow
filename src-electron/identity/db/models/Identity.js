"use strict";

const { Model } = require("objection");

class Identity extends Model {
  static get tableName() {
    return "identities";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["publisher"],

      properties: {
        aux: { type: "array" },
        av: { type: "string" },
        dn: { type: "string" },
        following: { type: "array" },
        hs: { type: "string" },
        meta: { type: "array" },
        posts: { type: "array" },
        publisher: { type: "string" },
        ts: { type: "integer" }
      }
    };
  }
}

module.exports = Identity;
