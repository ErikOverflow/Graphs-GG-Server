const config = require("../config");
const axios = require("axios");
const getDb = require("../dbs/riot/client");

const summonerByName = async (name, region) =>{
    let db = await getDb();
    //Get summoner data from db
    let summonerDoc;
    try{
        const staleDate = new Date();
        staleDate.setHours(staleDate.getHours() - config.stalenessThreshold);
        const query = {
            name: new RegExp(`^${name}$`, "i"),
            region: new RegExp(`^${region}$`, "i"),
        }
        summonerDoc = await db.collection("summoners").findOne(query);
        if(summonerDoc && summonerDoc.lastLookup > staleDate){
            return summonerDoc;
        }
    } catch(err) {
        console.error("Unable to get summoner data from DB");
        throw err;
    }

    /*Document needs to be updated with data from Riot*/
    //Fetch data from Riot
    let res
    try{
    res = await axios.get(config.summonerByNameUrl(region, name), config.axiosOptions);
    } catch(err) {
        console.log("Unable to get summoner data from Riot");
        throw err;
    }
    summonerDoc = res.data;
    summonerDoc.region = region;
    summonerDoc.lastLookup = new Date();

    //Update doc in DB
    try {
        const query = {
            name: new RegExp(`^${name}$`, "i"),
            region: new RegExp(`^${region}$`, "i"),
          };
          const updateDoc = {
            $set: summonerDoc,
          };
          const updateOptions = {
            upsert: true,
          };
          await db
            .collection("summoners")
            .updateOne(query, updateDoc, updateOptions);
    } catch(err) {
        console.error("Unable to update summoner doc in DB");
        throw err;
    }
    return summonerDoc;
}

const loadSummoner = async (req, res, next) => {
  if (!req.query.summonerName) {
    return res.status(400).json({ error: "Missing summoner name" });
  }
  if (!req.query.region) {
    return res.status(400).json({ error: "Missing region" });
  }
  const summonerName = req.query.summonerName;
  const region = req.query.region;

  req.summoner = await summonerByName(summonerName, region);
  return next();
};

module.exports = {
    loadSummoner
}
