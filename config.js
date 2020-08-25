const summonerByNameUrl = (region, summonerName) => `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
const matchListUrl = (region, accountId, beginIndex) => `https://${region}.api.riotgames.com/lol/match/v4/matchlists/by-account/${accountId}?beginIndex=${beginIndex}&endIndex=${beginIndex+100}`
const matchDetailsUrl = (region, gameId) => `https://${region}.api.riotgames.com/lol/match/v4/matches/${gameId}`

const axiosOptions = {
    headers: {
      "X-Riot-Token": process.env.RIOTKEY,
    },
  };

module.exports = {
    summonerByNameUrl,
    matchListUrl,
    matchDetailsUrl,
    axiosOptions
}