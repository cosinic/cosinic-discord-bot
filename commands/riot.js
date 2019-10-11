require('dotenv').config();
const axios = require('axios');
const RIOT_API = process.env.RIOT_API;

const SUMMONER_URL = 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/';
var RIOT_COMMANDS = {
    sucks(args, received) {
        received.channel.send("LEAGUE ISN'T BAD. YOU'RE BAD. SUCKS TO SUCK. -Everyone in cosinic.");
    },
    stat(args, received) {
        if (args.length > 0) {
            axios.get(`${SUMMONER_URL}${args.join(' ')}?api_key=${RIOT_API}`)
                .then((res) => {
                    let name = res.data.name;
                    let level = res.data.summonerLevel;
                    received.channel.send(`Player ${name} is level ${level}`);
                }).catch(error => {
                    console.log(error);
                });
        }
    }
}

module.exports = RIOT_COMMANDS;