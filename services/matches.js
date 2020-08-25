const config = require("../config");
const axios = require("axios");
const getDb = require("../dbs/riot/client");

const axiosOptions = {
  headers: {
    "X-Riot-Token": process.env.RIOTKEY,
  },
};

//endTime is the time the latest match started
const getMatchesByAccountId = async (
  region,
  accountId,
  beginIndex = 0
) => {
  const db = await getDb();

  //Find if the player has already been queried within the past 30 minutes
  let lastMatchQueryDoc;
  try {
    const halfHourAgo = new Date();
    halfHourAgo.setMinutes(halfHourAgo.getMinutes() - 30);
    const query = {
      accountId: accountId,
      region: new RegExp(`^${region}$`, "i"),
      lastMatchQuery: { $gte: halfHourAgo },
    };
    const findOptions = { projection: { _id: 0 } };
    lastMatchQueryDoc = await db
      .collection("matchqueries")
      .findOne(query, findOptions);
  } catch (err) {
    throw err;
  }

  //Get the last X matches if they haven't queried in the past 30 minutes
  //If there was a query in the last 30 minutes, STOP
  if (lastMatchQueryDoc) {
    return;
  }
  let lastMatches;
  try {
      console.log(config.matchHistoryUrl(region, accountId, beginIndex));
    let res = await axios.get(
      config.matchHistoryUrl(region, accountId, endTime),
      axiosOptions
    );
    const query = {
      accountId: accountId,
      region: new RegExp(`^${region}$`, "i"),
    };
    const docUpdate = {
      $set: { accountId, region },
      $currentDate: { lastMatchQuery: true },
    };
    const updateOptions = { upsert: true };
    lastMatches = res.data.matches;
    await db
      .collection("matchqueries")
      .updateOne(query, docUpdate, updateOptions);
  } catch (err) {
    throw err;
  }

  //Check the database for any of those matches already being there
  let newMatches;
  try {
    const query = {
      gameId: { $in: lastMatches.map((match) => match.gameId) },
      region,
    };
    const findOptions = { projection: { _id: 0, gameId: 1 } };
    let matchesAlreadyLoaded = await db
      .collection("matches")
      .find(query, findOptions);
    if (matchesAlreadyLoaded) {
      let matchIdAlreadyLoaded = [];
      await matchesAlreadyLoaded.forEach((match) => {
        matchIdAlreadyLoaded.push(match.gameId);
      });
      newMatches = lastMatches.filter((match) => {
        //Check to make sure the last 100 matches don't include any that are already loaded.
        return !matchIdAlreadyLoaded.includes(match.gameId);
      });
    } else {
      newMatches = lastMatches;
    }
  } catch (err) {
    throw err;
  }
  if (newMatches.length === 0) {
    return;
  }

  //Fetch extra detail about each match
  await Promise.all(
    newMatches.map(async (match) => {
      try {
        let res = await axios.get(
          config.matchDetailsUrl(region, match.gameId),
          axiosOptions
        );
        match.region = region;
        match.participants = res.data.participants;
        match.participantIdentities = res.data.participantIdentities;
        match.participantAccountIds = res.data.participantIdentities.map(
          (participant) => participant.player.accountId
        );
      } catch (err) {
        throw err;
      }
      return Promise.resolve("OK");
    })
  );
  try {
    await db.collection("matches").insertMany(newMatches);
  } catch (err) {
    throw err;
  }
};

const updateRecentMatches = async (req, res, next) => {
  await getMatchesByAccountId(req.summoner.region, req.summoner.accountId, 0);
  return next();
};

const getOlderMatchesByAccountId = async (region, accountId) => {
  const db = await getDb();
  try {
    const query = {
      participantAccountIds: accountId,
      region: new RegExp(`^${region}$`, "i"),
    };
    const findOptions = { projection: { _id: 0}, sort: {timestamp: 1}};
    let oldestMatch = await db
      .collection("matches")
      .findOne(query, findOptions);
    await getMatchesByAccountId(region, accountId, oldestMatch.timestamp);
  } catch (err) {
    throw err;
  }
};
getOlderMatchesByAccountId("NA1", "PqT1tpGQnIHGaY4Fhdoj_FefYiUI4mYMPzMHBazH7tI80hI");

module.exports = {
  updateRecentMatches,
};
