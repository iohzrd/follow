"use strict";

exports.up = (knex) => {
  return knex.schema.createTable("hiddenservice", (table) => {
    table.increments("id").primary();
    table.string("keyType");
    table.string("keyBlob");
    table.string("serviceId");
  });
};

exports.down = (knex) => {
  return knex.schema.dropTableIfExists("hiddenservice");
};
