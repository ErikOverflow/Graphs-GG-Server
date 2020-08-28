const getDb = require("../dbs/riot/client");
const config = require("../config");
const axios = require("axios");

//Get list of matches for Account ID. Params: AccountID, Region
//If no matches can be found, or the last match lookup for this account is over <stalenessThreshold> hours old, fetch from Riot
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
    staleDate.setHours(staleDate.getHours() - config.stalenessThreshold);
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
    (matchA, matchB) => matchA.timestamp - matchB.timestamp
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

//(req,res) with req.summoner.account and req.query.region
//Should be run after loadSummoner middleware
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

//Get match details for match Id
//Match Id should be on req.match.Id

module.exports = {
  loadMatchList,
};
