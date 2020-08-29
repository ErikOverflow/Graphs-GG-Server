const getDb = require("../dbs/riot/client");
const config = require("../config");
const axios = require("axios");

const timelineByGameId = async (gameId, platformId) =>{
    let db = await getDb();
    //Get summoner data from db
    let timelineDoc;
    try{
        const query = {
            gameId: gameId,
            platformId: new RegExp(`^${platformId}$`, "i"),
        }
        timelineDoc = await db.collection("timelines").findOne(query);
        if(timelineDoc)
        {
            return timelineDoc;
        }
    } catch(err) {
        console.error("Unable to get timeline data from DB");
        throw err;
    }

    /*Document needs to be updated with data from Riot*/
    //Fetch data from Riot
    let res
    try{
    res = await axios.get(config.timelineUrl(platformId,gameId), config.axiosOptions);
    } catch(err) {
        console.log("Unable to get timeline data from Riot");
        throw err;
    }
    timelineDoc = res.data;
    timelineDoc.platformId = platformId;

    //Update doc in DB
    try {
        const query = {
            gameId: gameId,
            platformId: new RegExp(`^${platformId}$`, "i"),
          };
          const updateDoc = {
            $set: timelineDoc,
          };
          const updateOptions = {
            upsert: true,
          };
          await db
            .collection("timelines")
            .updateOne(query, updateDoc, updateOptions);
    } catch(err) {
        console.error("Unable to upsert timeline doc in DB");
        throw err;
    }
    return timelineDoc;
}

module.exports = {
    timelineByGameId
}