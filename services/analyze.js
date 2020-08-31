const { timelineByGameId } = require("./timelines");
const { matchDetail } = require("./matches");
const breakdown = async (req, res) => {
  const gameIds = req.query.gameId;
  const region = req.query.region;
  const accountId = req.summoner.accountId;
  let timelineDoc = await timelineByGameId(gameId, region);
  let detailsDoc = await matchDetail(gameId, region);
  //Get all of the key data out of timeline and details
  let game = {
    timeline: timelineDoc,
    detail: detailsDoc,
  };
  return res.status(200).json(game);
};

module.exports = {
  breakdown,
};
