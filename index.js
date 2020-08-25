const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const getDb = require('./dbs/riot/client');
const v1 = express.Router();
app.use('/api/v1', v1);

const summoner = require('./services/summoner');
v1.get('/player', summoner.summonerParser, (req,res) => res.status(200).json(req.summoner));

const match = require('./services/match');
v1.get('/matches', summoner.summonerParser, match.loadMatches, (req,res) => res.status(200).json(req.summoner))
v1.get('/enrichMatches', summoner.summonerParser, match.enrichRecentMatches, (req,res) => res.status(200).json(req.summoner))

getDb().then(() => app.listen(process.env.PORT, () => console.log(`App is listening on port: ${process.env.PORT}`)));