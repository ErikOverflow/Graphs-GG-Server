const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const helmet = require("helmet");

const cors = require('cors');
const corsOptions = {
  origin: ['https://www.graphs.gg', /\.graphs\.gg$/, 'http://localhost:3000'],
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
//app.use(helmet);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
dotenv.config();
const getDb = require("./dbs/riot/client");
const v1 = express.Router();
app.use("/api/v1", v1);


const { loadMatchList, getMatchHistory } = require("./services/matches");
const { loadSummoner } = require("./services/summoners");
const { breakdown } = require("./services/analyze");
//region=NA1&summonerName=I have cute dogs&start=0&end=9
v1.get("/matchHistory", loadSummoner, loadMatchList, getMatchHistory);
//region=NA1&gameId=3527153822
v1.get("/matchBreakdown", breakdown)
v1.get("/ping", (req, res) => res.send("Pinged"));

getDb();

module.exports = app;

// app.listen(process.env.PORT, () =>
//     console.log(`App is listening on port: ${process.env.PORT}`)
// );