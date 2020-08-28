const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const getDb = require("./dbs/riot/client");
const v1 = express.Router();
app.use("/api/v1", v1);


const { loadMatchList } = require("./services/matches");
const {loadSummoner} = require("./services/summoners");
v1.get("/test", loadSummoner, loadMatchList, (req, res) =>
  res.status(200).json(req.matchList)
); // async (req,res) => res.status(200).json(await matches.getMatchListByAccountId("PqT1tpGQnIHGaY4Fhdoj_FefYiUI4mYMPzMHBazH7tI80hI", "NA1")));

//_eUPZiyUA-5o60uLguiCO09fftG65AVktg9zsPIRY-Q
getDb().then(() =>
  app.listen(process.env.PORT, () =>
    console.log(`App is listening on port: ${process.env.PORT}`)
  )
);
