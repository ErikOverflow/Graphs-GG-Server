const { timelineByGameId } = require("./timelines");
const { matchDetail } = require("./matches");
const { Timestamp } = require("mongodb");
const breakdown = async (req, res) => {
  const gameId = req.query.gameId;
  const region = req.query.region;
  let timelineDoc = await timelineByGameId(gameId, region);
  let detailsDoc = await matchDetail(gameId, region);
  const participants = {};
  const participantStatHistory = {};
  for (const participantIdentity of detailsDoc.participantIdentities){
    participants[participantIdentity.participantId] = {
      summonerName: participantIdentity.player.summonerName,
      accountId: participantIdentity.player.accountId
    }
  }
  for(const participant of detailsDoc.participants){
    participants[participant.participantId].championId = participant.championId;
    participantStatHistory[participant.participantId] = [];
  }
  //Breakdown frames
  const killEvents = [];
  for (const frame of timelineDoc.frames){
    for (const [id, pFrame] of Object.entries(frame.participantFrames)){
      participantStatHistory[id].push({
        totalGold: pFrame.totalGold,
        currentGold: pFrame.currentGold,
        level: pFrame.level,
        xp: pFrame.xp,
        time: frame.timestamp
      });
    }
    for (const event of frame.events){
      if(event.type === "CHAMPION_KILL"){
        killEvents.push({
          ...event,
        });
      }
    }
  }
  //Get all of the key data out of timeline and details
  let game = {
    participants,
    participantStatHistory,
    killEvents
  };
  return res.status(200).json(game);
};

module.exports = {
  breakdown,
};
