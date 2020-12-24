"use strict";

exports.up = knex => {
  return knex.schema.createTable("pins", table => {
    table.increments("id").primary();
    table.jsonb("identity_pins");
    table.jsonb("post_pins");
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists("posts");
};
