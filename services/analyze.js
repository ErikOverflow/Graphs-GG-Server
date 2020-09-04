const { timelineByGameId } = require("./timelines");
const { matchDetail } = require("./matches");
const breakdown = async (req, res) => {
  const gameId = req.query.gameId;
  const region = req.query.region;
  let detailsDoc = await matchDetail(gameId, region);

  //Add participants and their stat history
  const participants = {};
  for (const participantIdentity of detailsDoc.participantIdentities){
    participants[participantIdentity.participantId] = {
      summonerName: participantIdentity.player.summonerName,
      accountId: participantIdentity.player.accountId,
    }
  }
  for(const participant of detailsDoc.participants){
    //TODO: Look up champion ID and give champion name and PNG link instead
    participants[participant.participantId].championId = participant.championId;
    participants[participant.participantId].teamId = participant.teamId;
    //TODO: Look up spell IDs and give spell name and PNG link instead
    participants[participant.participantId].spell1Id = participant.spell1Id;
    participants[participant.participantId].spell2Id = participant.spell2Id;
    participants[participant.participantId].statHistory = [];
  }

  let timelineDoc = await timelineByGameId(gameId, region);
  //Breakdown frames
  const killEvents = [];
  for (const frame of timelineDoc.frames){
    for (const [id, pFrame] of Object.entries(frame.participantFrames)){
      participants[id].statHistory.push({
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
    killEvents,
    ticks: timelineDoc.frames.length,
    timestamps: timelineDoc.frames.map(frame => {
      return frame.timestamp
    })
  };
  return res.status(200).json(game);
};

module.exports = {
  breakdown,
};
