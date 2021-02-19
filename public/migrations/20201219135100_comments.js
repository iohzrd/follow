"use strict";

exports.up = knex => {
  return knex.schema.createTable("comments", table => {
    table.boolean("acknowledged");
    table.integer("ts");
    table.string("cid");
    table.string("content");
    table.string("from");
    table.string("inReplyTo");
    table.string("topic");
    table.string("type");
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists("comments");
};
