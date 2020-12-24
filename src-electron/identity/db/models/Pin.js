"use strict";

const { Model } = require("objection");

class Pin extends Model {
  static get tableName() {
    return "pins";
  }

  static get jsonSchema() {
    return {
      type: "array"
    };
  }
}

module.exports = Pin;
