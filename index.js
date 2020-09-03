const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const cors = require('cors');
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
dotenv.config();
const getDb = require("./dbs/riot/client");
const v1 = express.Router();
app.use("/api/v1", v1);


const { loadMatchList, getMatchHistory } = require("./services/matches");
const {loadSummoner} = require("./services/summoners");
const {breakdown} = require("./services/analyze");
//region=NA1&summonerName=I have cute dogs&start=0&end=9
v1.get("/matchHistory", loadSummoner, loadMatchList, getMatchHistory);
//region=NA1&gameId=3527153822
v1.get("/matchBreakdown", breakdown)

//_eUPZiyUA-5o60uLguiCO09fftG65AVktg9zsPIRY-Q
getDb().then(() =>
  app.listen(process.env.PORT, () =>
    console.log(`App is listening on port: ${process.env.PORT}`)
  )
);
