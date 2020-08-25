const MongoClient = require("mongodb").MongoClient;
let db;

const getDb = async () => {
  if (!db) {
    try {
      const client = await MongoClient.connect("mongodb://localhost:27017/", {
        useUnifiedTopology: true,
      });
      db = client.db("riot");
    } catch (err) {
      throw err;
    }
  }
  return db;
};

module.exports = getDb;
