const config = require("../config");
const axios = require("axios");
const matchDb = require("../dbs/riot/match");
const { insertMatchList, updateMatchList } = require("../dbs/riot/match");
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
          participants: [accountId],
        };
      });
    } catch (err) {
      throw err;
    }
    //Prune them for duplicates
    let duplicateMatches = await matchDb.getDuplicateMatches(matches, region);
    let updateMatches = [];
    let oldMatches = [];
    if(duplicateMatches.length>0){
        duplicateMatches.forEach((match) => {
            if (!match.participants.includes(accountId)) {
              match.participants.push(accountId);
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
        await updateMatchList(region, updateMatches);
    }
    //Insert new matches into collection
    beginIndex += matches.length;
  } while (matches.length > 0);
};

const loadMatches = async (req, res, next) => {
  await getMatches(req.summoner.region, req.summoner.accountId);
  return next();
};

module.exports = {
  loadMatches,
};
