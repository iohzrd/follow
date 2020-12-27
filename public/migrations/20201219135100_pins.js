"use strict";

exports.up = knex => {
  return knex.schema.createTable("pins", table => {
    table.string("publisher").primary();
    table.jsonb("pins");
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists("pins");
};
