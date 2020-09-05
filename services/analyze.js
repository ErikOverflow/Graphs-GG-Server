const { timelineByGameId } = require("./timelines");
const { matchDetail } = require("./matches");
const {getChampionByKey, getSummonerSpellByKey}= require('./dataDragon');
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
    const champion = await getChampionByKey(participant.championId);
    participants[participant.participantId].championName = champion.name;
    participants[participant.participantId].championImg = `${process.env.CDN}/img/champion/${champion.image.full}`;
    participants[participant.participantId].teamId = participant.teamId;
    //TODO: Look up spell IDs and give spell name and PNG link instead
    const spell1 = await getSummonerSpellByKey(participant.spell1Id);
    const spell2 = await getSummonerSpellByKey(participant.spell2Id);
    participants[participant.participantId].spell1Name = spell1.name;
    participants[participant.participantId].spell2Name = spell2.name;
    participants[participant.participantId].spell1Img = `${process.env.CDN}/img/spell/${spell1.image.full}`;
    participants[participant.participantId].spell2Img = `${process.env.CDN}/img/spell/${spell2.image.full}`;
    participants[participant.participantId].statHistory = [];
  }
  let timelineDoc = await timelineByGameId(gameId, region);
  //Breakdown frames
  const killEvents = [];
  for (const frame of timelineDoc.frames){
    for (const pFrame of Object.values(frame.participantFrames)){
      participants[pFrame.participantId].statHistory.push({
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
