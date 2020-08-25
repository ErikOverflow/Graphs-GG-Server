const config = require("../config");
const axios = require("axios");
const { insertMatchList, updateMatchList, getRecentBasicMatches, getDuplicateMatches, updateMatch, getAllMatchesForMultipleAccounts } = require("../dbs/riot/match");
const {getMultipleSummonersByName} = require("./summoner");
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
  const matches = await getRecentBasicMatches(req.summoner.region, req.summoner.accountId, 10);
  if(matches.length === 0){
    return next();
  }
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

const getOverlaps = async (region, summonerNames) => {
  const summoners = await getMultipleSummonersByName(region, summonerNames);
  const matches = await getAllMatchesForMultipleAccounts(region, summoners.map(summoner=> summoner.accountId));
  matches.forEach(match => {
      match.gameEnd = match.gameCreation + match.gameDuration*1000
      match.date = new Date(match.gameCreation)
    })
  let overlaps = [];
  //Go through matches and compare the current match to the next
  for (let i = 1; i<matches.length-1; i++){
    //Games are in descending orders. Most recent first.
    //Current match SHOULD start after the previous match ended
    if(matches[i].gameEnd > matches[i-1].gameCreation){
      let matchA = {
        gameId: matches[i].gameId,
        date: matches[i].date,
        duration: matches[i].gameDuration,
      }
      let matchB = {
        gameId: matches[i-1].gameId,
        date: matches[i-1].date,
        duration: matches[i-1].gameDuration
      }
      overlaps.push([matchA, matchB])
    }

    if(matches[i].gameCreation < matches[i+1].gameCreation){
      let matchA = {
        gameId: matches[i].gameId,
        date: matches[i].date,
        duration: matches[i].gameDuration
      }
      let matchB = {
        gameId: matches[i+1].gameId,
        date: matches[i+1].date,
        duration: matches[i+1].gameDuration
      }
      overlaps.push([matchA, matchB])
    }
  }
  return overlaps;
}

const checkOverlaps = async (req, res) => {
  const overlaps = await getOverlaps(req.query.region, req.query.summonerName);
  return res.status(200).send(overlaps);
}

//5head indeed
//TOP WAVE CONTROL
//T0P KINGD0M
//edaIB FT
module.exports = {
  loadMatches,
  enrichRecentMatches,
  checkOverlaps
};
