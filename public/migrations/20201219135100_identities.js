"use strict";

exports.up = knex => {
  return knex.schema.createTable("identities", table => {
    table.jsonb("aux");
    table.string("av");
    table.string("dn");
    table.jsonb("following");
    table.string("hs");
    table.jsonb("meta");
    table.jsonb("posts");
    table.string("publisher").primary();
    table.integer("ts");
  });
};

exports.down = knex => {
  return knex.schema.dropTableIfExists("identities");
};
