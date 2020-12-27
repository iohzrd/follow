// run the following command to install:
// npm install objection knex sqlite3

const { Model } = require("objection");
const Knex = require("knex");

// Initialize knex.
const knex = Knex({
  client: "sqlite3",
  debug: true,
  useNullAsDefault: true,
  connection: {
    filename: "test.db"
  }
});

// Give the knex instance to objection.
Model.knex(knex);

class Pin extends Model {
  static get tableName() {
    return "pins";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["publisher", "pins"],

      properties: {
        publisher: { type: "string" },
        pins: { type: "array" }
      }
    };
  }
}

async function createSchema() {
  if (await knex.schema.hasTable("pins")) {
    return;
  }

  await knex.schema.createTable("pins", table => {
    table.string("publisher").primary();
    table.jsonb("pins");
  });
}

async function main() {
  let pins = [];
  let pins_query = await Pin.query().findOne("publisher", "asdf");
  console.log(pins_query);
  if (pins_query) {
    pins = pins_query.pins;
    pins.push("pinX");
    await Pin.query()
      .findOne("publisher", "asdf")
      .patch({
        publisher: "asdf",
        pins: pins
      });
  } else {
    pins = ["pin1"];
    const publisher = await Pin.query().insert({
      publisher: "asdf",
      pins: pins
    });
    console.log("created:", publisher);
  }
  let db_pins = await Pin.query().findOne("publisher", "asdf");
  console.log(db_pins.pins);
}

createSchema()
  .then(() => main())
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });
