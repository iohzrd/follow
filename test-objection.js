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

// Person model.
class Post extends Model {
  static get tableName() {
    return "posts";
  }

  static get relationMappings() {
    return {
      children: {
        relation: Model.HasManyRelation,
        modelClass: Post,
        join: {
          from: "posts.id",
          to: "posts.parentId"
        }
      }
    };
  }
}

async function createSchema() {
  if (await knex.schema.hasTable("posts")) {
    return;
  }

  // Create database schema. You should use knex migration files
  // to do this. We create it here for simplicity.
  await knex.schema.createTable("posts", table => {
    table.increments("id").primary();
    table.integer("parentId").references("posts.id");
    table.string("body");
    table.string("dn");
    table.string("filesRoot");
    table.string("magnet");
    table.string("publisher");
    table.integer("ts");
    table.jsonb("files");
    table.jsonb("meta");
  });
}

async function main() {
  // Create some people.
  const post = await Post.query().insertGraph({
    body: String(Math.floor(new Date().getTime())),
    dn: "iohzrd",
    files: ["file1.txt", "file2.txt"],
    filesRoot: "",
    magnet: "",
    meta: ["meta1", "meta2"],
    publisher: "Qmb4zrL17TtLGnaLFuUQC4TmaVbizEfVbDnnSzNLxkZ3Zp",
    ts: Math.floor(new Date().getTime())
  });

  console.log("created:", post);

  // Fetch all people named Sylvester and sort them by id.
  // Load `children` relation eagerly.
  const posts = await Post.query()
    // .where("publisher", "Qmb4zrL17TtLGnaLFuUQC4TmaVbizEfVbDnnSzNLxkZ3Zp")
    .orderBy("ts", "desc");

  console.log(posts);
}

createSchema()
  .then(() => main())
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });
