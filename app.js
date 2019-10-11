require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');

const RIOT_API = process.env.RIOT_API;

client.on('ready', () => {
    console.log("Bot is running");
});

client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) { // Prevent bot from responding to its own messages
        return
    }

    if(receivedMessage.author.bot) { // Prevent bot from responding to other bots
        return;
    }

    if (receivedMessage.content.startsWith("!")) {
        processCommand(receivedMessage);
    }
})

function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading exclamation mark
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the exclamation is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    if (primaryCommand == "help") {
        helpCommand(arguments, receivedMessage)
    } else if (primaryCommand == "lolstats") {
        statsCommand(arguments, receivedMessage);
    } else if (primaryCommand == "lolsucks") {
        suckCommand(arguments, receivedMessage);
    } else {
        return;
    }
}


function helpCommand(arguments, receivedMessage) {
    if (arguments.length > 0) {
        receivedMessage.channel.send("It looks like you might need help with " + arguments)
    } else {
        receivedMessage.channel.send("I'm not sure what you need help with. Try `!help [topic]`")
    }
}

function suckCommand(args, received) {
   received.channel.send("LEAGUE ISN'T BAD. YOU'RE BAD. SUCKS TO SUCK. -Everyone in cosinic.");
}

const summoner_url = 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/';
function statsCommand(args, received) {
  if (arguments.length > 0) {
    axios.get(`${summoner_url}${args}?api_key=${RIOT_API}`)
      .then((res) => {
	   let name = res.data.name;
           let level = res.data.summonerLevel;
           received.channel.send(`Player ${name} is level ${level}`);
       }).catch(error => {
           console.log(error);
       });
  }
}

bot_secret_token = process.env.BOT_SECRET;
client.login(bot_secret_token);
