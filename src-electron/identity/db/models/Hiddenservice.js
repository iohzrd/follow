"use strict";

const { Model } = require("objection");

class Hiddenservice extends Model {
  static get tableName() {
    return "hiddenservice";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["keyType", "keyBlob", "serviceId"],

      properties: {
        keyType: { type: "string" },
        keyBlob: { type: "string" },
        serviceId: { type: "string" }
      }
    };
  }
}

module.exports = Hiddenservice;
