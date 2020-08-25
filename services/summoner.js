const config = require("../config");
const axios = require("axios");
const getDb = require("../dbs/riot/client");

const axiosOptions = {
  headers: {
    "X-Riot-Token": process.env.RIOTKEY,
  },
};

const getSummonerByName = async (region, summonerName) => {
  const db = await getDb();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const query = {
    name: new RegExp(`^${summonerName}$`, "i"),
    region: new RegExp(`^${region}$`, "i"),
    lastModified: { $gte: yesterday },
  };
  const findOptions = { projection: { _id: 0 } };
  let summonerDoc;
  try {
    summonerDoc = await db.collection("summoners").findOne(query, findOptions);
  } catch (err) {
    throw err;
  }

  if (summonerDoc) {
    return summonerDoc;
  }
  //All code after this line is a case where summonerDoc was not in mongoDb.
  delete query.lastModified;
  let res;

  try {
    res = await axios.get(
      config.summonerByNameUrl(region, summonerName),
      axiosOptions
    );
  } catch (err) {
    throw err;
  }
  res.data.region = region;
  const docUpdate = {
    $set: res.data,
    $currentDate: { lastModified: true },
  };
  const updateOptions = { upsert: true };
  try {
    await db.collection("summoners").updateOne(query, docUpdate, updateOptions);
    summonerDoc = await db.collection("summoners").findOne(query, findOptions);
  } catch (err) {
    throw err;
  }

  return summonerDoc;
};

const summonerParser = async (req, res, next) => {
  if (!req.query.summonerName || !req.query.region) {
    return res.status(403).json({ error: "Missing summoner name or region" });
  }
  req.summoner = await getSummonerByName(
    req.query.region,
    req.query.summonerName
  );
  return next();
};

const getMultipleSummonersByName = async (region, summonerNames) => {
  let summoners = [];
  await Promise.all(
    summonerNames.map(async (summonerName) => {
      summoners.push(await getSummonerByName(region, summonerName));
    })
  );
  return summoners;
};

module.exports = {
  summonerParser,
  getMultipleSummonersByName,
};
