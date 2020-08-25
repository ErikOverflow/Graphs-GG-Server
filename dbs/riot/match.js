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

const updateMatchList = async (matchList) => {
  let db = await getDb();
  await Promise.all(
    matchList.map((match) => {
      updateMatch(match);
    })
  );
};

const updateMatch = async (match) => {
  let db = await getDb();
  try {
    const query = {
      gameId: match.gameId,
      platformId: new RegExp(`^${match.platformId}$`, "i"),
    };
    const docUpdate = {
      $set: match,
    };
    return db.collection("matches").updateOne(query, docUpdate);
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

const getRecentBasicMatches = async (region, accountId, count = 10) => {
  let db = await getDb();
  try {
    const query = {
      players: accountId,
      platformId: region,
      gameDuration: null,
    };
    let recentMatches = await db
      .collection("matches")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(count)
      .toArray();
    return recentMatches;
  } catch (err) {
    throw err;
  }
};

const getAllMatches = async (region, accountId) => {
  let db = await getDb();
  try {
    const query = {
      players: accountId,
      platformId: region,
    };
    let allMatches = await db
      .collection("matches")
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();
    return allMatches;
  } catch (err) {
    throw err;
  }
};

const getAllMatchesForMultipleAccounts = async (region, accountIds) => {
  let db = await getDb();
  try {
    const query = {
      players: {$in: accountIds},
      platformId: region,
    };
    let allMatches = await db
      .collection("matches")
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();
    return allMatches;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  insertMatchList,
  getDuplicateMatches,
  updateMatchList,
  updateMatch,
  getRecentBasicMatches,
  getAllMatches,
  getAllMatchesForMultipleAccounts
};