const config = require("../config");
const axios = require("axios");
const { findOneTimeline, insertTimeline } = require("../dbs/riot/timelines");

const getTimeline = async (req, res, next) => {
    const region = req.query.region;
    const gameId = req.query.gameId;
    if(!region || !gameId){
        return res.status(403).send("Missing region or game ID");
    }
  try {
    req.timelineData = await findOneTimeline(region, gameId);
    if (req.timelineData) {
      return next();
    }
    let riotRes = await axios.get(
      config.timelineUrl(region, gameId),
      config.axiosOptions
    );
    timelineDoc = riotRes.data;
    await insertTimeline(region, gameId, timelineDoc);
    req.timelineData = timelineDoc;
    return next();
  } catch (err) {
    throw err;
  }
};

const getIndicativeTimelineData = (req, res) => {
    
    for (const frame of req.timelineData.frames){
        
    }
    return res.status(200).send("Good");
}

module.exports = {
    getTimeline,
    getIndicativeTimelineData
}