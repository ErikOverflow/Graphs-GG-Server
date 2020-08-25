const config = require("../../config");
const getDb = require("./client");
const match = require("../../services/match");

const insertMatchList = async (matchList) => {
  let db = await getDb();
  try {
    await db.collection("matches").insertMany(matchList);
  } catch (err) {
    throw err;
  }
};

const updateMatchList = async (region, matchList) => {
  let db = await getDb();
  try {
    await Promise.all(matchList.map((match) => {
      const query = {
        gameId: match.gameId,
        platformId: new RegExp(`^${region}$`, "i"),
      };
      const docUpdate = {
        $set: match
      };
      return db
        .collection("matches")
        .updateOne(query, docUpdate);
    }));
  } catch (err) {
    throw err;
  }
};

const getDuplicateMatches = async (matchList, region) => {
  let db = await getDb();
  if (matchList.length === 0) {
    return;
  }
  try {
    const query = {
      gameId: { $in: matchList.map((match) => match.gameId) },
      platformId: region,
    };
    let duplicateMatches = await db.collection("matches").find(query).toArray();
    return duplicateMatches;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  insertMatchList,
  getDuplicateMatches,
  updateMatchList
};
