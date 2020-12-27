"use strict";

const { Model } = require("objection");

class Pin extends Model {
  static get tableName() {
    return "pins";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["pins", "publisher"],

      properties: {
        pins: { type: "array" },
        publisher: { type: "string" }
      }
    };
  }
}

module.exports = Pin;
