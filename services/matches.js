const getDb = require("../dbs/riot/client");
const config = require("../config");
const axios = require("axios");
const { response } = require("express");
const { getQueueById } = require("./dataDragon");

//Get list of matches for Account ID. Params: AccountID, Region
//If no matches can be found, or the last match lookup for this account is over <stalenessThreshold> minutes old, fetch from Riot
const matchListByAccountId = async (accountId, region) => {
  let db = await getDb();
  /*fetch matches from DB*/
  //Check DB first. If there are matches in the DB, return those.
  let matchList;
  try {
    const query = {
      accountId,
      region: new RegExp(`^${region}$`, "i"),
    };
    matchList = await db.collection("matchlists").findOne(query);
    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - config.stalenessThreshold);
    if (
      matchList &&
      matchList.matches.length > 0 &&
      matchList.lastLookup > staleDate
    ) {
      return matchList;
    }
  } catch (err) {
    console.error("Unable to get matches from DB");
    throw err;
  }

  /*fetch matches from Riot and add to DB*/
  //There were no matches found, or the data was stale.
  let beginIndex = 0;
  //Create new matchList object if needed
  if (!matchList) {
    matchList = {
      accountId,
      region,
      matches: [],
    };
  }
  matchList.lastLookup = new Date();
  let totalGames;
  let uniqueMatches;
  const storedGameIds = matchList.matches.map((match) => match.gameId);
  do {
    let matchesFound;
    try {
      let res = await axios.get(
        config.matchListUrl(region, accountId, beginIndex),
        config.axiosOptions
      );
      totalGames = res.data.totalGames;
      matchesFound = res.data.matches.length;
      uniqueMatches = res.data.matches.filter(
        (match) => !storedGameIds.includes(match.gameId)
      );
      //Only append unique matches to the matchList object
      matchList.matches.push(...uniqueMatches);
    } catch (err) {
      console.error("Unable to fetch match list from Riot");
      throw err;
    }
    beginIndex += matchesFound;
    //Continue the while loop when there are more matches to be loaded, and there were unique matches loaded in the previous loop
  } while (beginIndex < totalGames && uniqueMatches.length > 0);
  matchList.matches.sort(
    (matchA, matchB) => matchB.timestamp - matchA.timestamp
  );
  //Upsert the matchList to the DB
  try {
    const query = {
      accountId,
      region: new RegExp(`^${region}$`, "i"),
    };
    const updateDoc = {
      $set: matchList,
    };
    const updateOptions = {
      upsert: true,
    };
    await db
      .collection("matchlists")
      .updateOne(query, updateDoc, updateOptions);
  } catch (err) {
    console.error("Unable to upsert match list to DB");
    throw err;
  }
  return matchList;
};

//Run this to update the matchList
const loadMatchList = async (req, res, next) => {
  if (!req.summoner || !req.summoner.accountId) {
    return res.status(400).send("Missing summoner reference");
  }
  if (!req.query.region) {
    return res.status(400).send("Missing region");
  }
  const accountId = req.summoner.accountId;
  const region = req.query.region;

  req.matchList = await matchListByAccountId(accountId, region);
  return next();
};

const matchDetail = async (gameId, region) => {
  let db = await getDb();
  //Get match data from db
  let matchDetailDoc;
  try{
      const query = {
          gameId: Number(gameId),
          platformId: new RegExp(`^${region}$`, "i"),
      }
      matchDetailDoc = await db.collection("matchdetails").findOne(query);
      if(matchDetailDoc)
      {
          return matchDetailDoc;
      }
  } catch(err) {
      console.error("Unable to get matchDetail data from DB");
      throw err;
  }

  /*Document needs to be updated with data from Riot*/
  //Fetch data from Riot
  let res
  try{
  res = await axios.get(config.matchDetailsUrl(region, gameId), config.axiosOptions);
  } catch(err) {
      console.log("Unable to get matchDetail data from Riot");
      throw err;
  }
  matchDetailDoc = res.data;

  //Update doc in DB
  try {
      const query = {
          gameId: Number(gameId),
          platformId: new RegExp(`^${region}$`, "i"),
        };
        const updateDoc = {
          $set: matchDetailDoc,
        };
        const updateOptions = {
          upsert: true,
        };
        await db
          .collection("matchdetails")
          .updateOne(query, updateDoc, updateOptions);
  } catch(err) {
      console.error("Unable to upsert matchDetail doc in DB");
      throw err;
  }
  return matchDetailDoc;
}

//Load the match histories from the matchList attached to the request
const sliceMatchHistory = async (matchList, start = 0, end = 10) => {
  let matches = matchList.matches.slice(start, end);
  let matchDetails = [];
  await Promise.all(matches.map(async (match)=>{
    const detail = await matchDetail(match.gameId, match.platformId);
    const queue = await getQueueById(detail.queueId);
    detail.queueName = queue.description.split("games")[0];
    detail.mapName = queue.map;
    matchDetails.push(detail);
  }))

  matchDetails.sort(
    (matchA, matchB) => matchB.gameCreation - matchA.gameCreation
  );

  return matchDetails;
}

const getMatchHistory = async (req,res) => {
  let matchHistory = await sliceMatchHistory(req.matchList, req.query.start, req.query.end);  
  return res.status(200).json(matchHistory);

}

//Get match details for match Id
//Match Id should be on req.match.Id

module.exports = {
  loadMatchList,
  getMatchHistory,
  matchDetail
};
