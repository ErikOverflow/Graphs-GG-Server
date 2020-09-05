const axios = require("axios");

let championByKeyJson = {};
let itemJson = {};
let queuesJson = {};
let summonerSpellJson = {};

const getLatestChampionJson = async (language = "en_US") => {
    if(championByKeyJson[language]){
        return championByKeyJson[language];
    }

    let res;
    try{
        res = await axios.get(`${process.env.CDN}/data/${language}/champion.json`);
    } catch (err){
        console.error("Unable to get champion JSON");
    }
    championByKeyJson[language] = {};
    for (const champion of Object.values(res.data.data)){
        championByKeyJson[language][champion.key] = champion;
    }
}

const getLatestItemJson = async (language = "en_US") => {
    if(itemJson[language]){
        return itemJson[language];
    }

    let res;
    try{
        res = await axios.get(`${process.env.CDN}/data/${language}/item.json`);
    } catch (err){
        console.error("Unable to get item JSON");
    }

    itemJson[language] = res.data;
}

const getLatestSummonerSpellJson = async (language = "en_US") => {
    if(summonerSpellJson[language]){
        return summonerSpellJson[language];
    }

    let res;
    try{
        res = await axios.get(`${process.env.CDN}/data/${language}/summoner.json`);
    } catch (err){
        console.error("Unable to get champion JSON");
    }
    summonerSpellJson[language] = {};
    for (const spell of Object.values(res.data.data)){
        summonerSpellJson[language][spell.key] = spell;
    }
}

const getLatestQueueJson = async () => {
    if(queuesJson){
        return queuesJson;
    }
    let res;
    try{
        res = await axios.get(`${process.env.CDN}/queues.json`);
    } catch (err){
        console.error("Unable to get champion JSON");
    }
}

const getChampionByKey = async (key, language = "en_US") => {
    const champByKeyJson = await getLatestChampionJson(language);
    return champByKeyJson[key];
}

const getSummonerSpellByKey = async (key, language = "en_US") => {
    const spellByKeyJson = await getLatestSummonerSpellJson(language);
    return spellByKeyJson[key];
}

getLatestChampionJson();
getLatestItemJson();
getLatestQueueJson();
getLatestSummonerSpellJson();

module.exports = {
    getChampionByKey,
    getSummonerSpellByKey
}