const { timelineByGameId } = require("./timelines");
const {matchDetail} = require('./matches');
const analyze = async (req, res) => {
    const gameIds = req.body.gameIds;
    const region = req.query.region;
    const accountId = req.summoner.accountId;
    let games = [];
    await Promise.all(gameIds.map(async gameId => {
        let timelineDoc = await timelineByGameId(gameId, region);
        let detailsDoc = await matchDetail(gameId, region);
        let game = {
            timeline: timelineDoc,
            detail: detailsDoc
        }
        games.push(game);
    }))
    return res.status(200).json(games);
}

const gameDataExtractor = async (game) => {
    const frames = timeline.frames;
}

module.exports = {
    analyze
}