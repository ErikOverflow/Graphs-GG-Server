const config = require("../config");
const axios = require("axios");
const { insertMatchList, updateMatchList, getRecentMatches, getDuplicateMatches, updateMatch } = require("../dbs/riot/match");
const match = require("../dbs/riot/match");

const getMatches = async (region, accountId) => {
  let beginIndex = 0;
  let matches;
  do {
    //Get matches from Riot API
    try {
      let res = await axios.get(
        config.matchListUrl(region, accountId, beginIndex),
        config.axiosOptions
      );
      matches = res.data.matches.map((match) => {
        return {
          platformId: match.platformId,
          gameId: match.gameId,
          queue: match.queue,
          season: match.season,
          timestamp: match.timestamp,
          players: [accountId],
        };
      });
    } catch (err) {
      throw err;
    }
    //Prune them for duplicates
    let duplicateMatches = await getDuplicateMatches(matches, region);
    let updateMatches = [];
    let oldMatches = [];
    if(duplicateMatches && duplicateMatches.length>0){
        duplicateMatches.forEach((match) => {
            if (!match.players.includes(accountId)) {
              match.players.push(accountId);
              updateMatches.push(match);
            }
            oldMatches.push(match.gameId);
          });
    }
    let newMatches = matches.filter(
      (match) => !oldMatches.includes(match.gameId)
    );
    if (newMatches.length > 0) {
      await insertMatchList(newMatches);
    }
    if(updateMatches.length > 0){
        await updateMatchList(updateMatches);
    }
    //Insert new matches into collection
    beginIndex += matches.length;
  } while (matches.length > 0);
};

const loadMatches = async (req, res, next) => {
  await getMatches(req.summoner.region, req.summoner.accountId);
  return next();
};

const gethMatchDetails = async (region, gameId) => {
  try {
    let res = await axios.get(
      config.matchDetailsUrl(region, gameId),
      config.axiosOptions
    );
    return res.data;
  }
  catch(err) {
    throw err;
  }
}

const enrichRecentMatches = async (req, res, next) => {
  const matches = await getRecentMatches(req.summoner.region, req.summoner.accountId, 10);
  await Promise.all(matches.map(async match => {
    let matchDetails = await gethMatchDetails(match.platformId, match.gameId);
    match = {
      ...match,
      ...matchDetails
    }
    await updateMatch(match);
  }));
  return next();
}

//5head indeed
//t0p kingdom
//TOP WAVE CONTROL
//T0P KINGD0M
//edaIB FT
module.exports = {
  loadMatches,
  enrichRecentMatches
};
