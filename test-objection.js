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
    filename: "objection.db"
  }
});

// Give the knex instance to objection.
Model.knex(knex);

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

async function createSchema() {
  if (await knex.schema.hasTable("hiddenservice")) {
    return;
  }

  await knex.schema.createTable("hiddenservice", table => {
    table.increments("id").primary();
    table.string("keyType");
    table.string("keyBlob");
    table.string("serviceId");
  });
}

async function main() {
  let hiddenservice = {};
  let hs_query = await Hiddenservice.query().findOne("keyType", "asdfff");
  if (hs_query) {
    hiddenservice = hs_query;
    console.log(hiddenservice);
  } else {
    // hiddenservice = {
    //   keyType: "asdff",
    //   keyBlob: "asdf",
    //   serviceId: "asdf"
    // };
    // const hs = await Hiddenservice.query().insert(hiddenservice);
    // console.log("created:", hs);
  }
  console.log(hs_query);
}

createSchema()
  .then(() => main())
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });
