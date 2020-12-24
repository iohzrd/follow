"use strict";

exports.up = knex => {
  return knex.schema.createTable("posts", table => {
    table.string("aux");
    table.string("body");
    table.jsonb("files");
    table.string("filesRoot");
    table.string("magnet");
    table.jsonb("meta");
    table.string("postCid").primary();
    table.string("publisher");
    table.integer("ts");
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists("posts");
};
