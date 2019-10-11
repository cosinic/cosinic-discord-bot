require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');

const DISCORD_API = process.env.BOT_SECRET;
const RIOT_API = process.env.RIOT_API;
const IEX_API = process.env.IEX_API;

client.on('ready', () => {
    console.log("Bot is running");
});

client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) { // Prevent bot from responding to its own messages
        return
    }

    if (receivedMessage.author.bot) { // Prevent bot from responding to other bots
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

    switch (primaryCommand) {
        case 'help':
            helpCommand(arguments, receivedMessage);
            break;
        case 'lolstats':
            statsCommand(arguments, receivedMessage);
            break;
        case 'lolsucks':
            suckCommand(arguments, receivedMessage);
            break;
        case 'stock':
            getStock(arguments, receivedMessage);
            break;
        default:
            break;
    }
}

function helpCommand(args, received) {
    if (args.length > 0) {
        received.channel.send("It looks like you might need help with " + args)
        switch (args.join(' ')) {
            case 'lolstats':
                received.channel.send("You can use this command like: `!lolstats [SUMMONER_USERNAME]`");
                break;
            case 'stock':
                received.channel.send("You can use this command like: `!stock [TICKER] [MONTHS(optional)]`");
                break;
            default:
                break;
        }
    } else {
        received.channel.send("I'm not sure what you need help with. Try `!help [topic]`")
    }
}

function suckCommand(args, received) {
    received.channel.send("LEAGUE ISN'T BAD. YOU'RE BAD. SUCKS TO SUCK. -Everyone in cosinic.");
}

const SUMMONER_URL = 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/';

function statsCommand(args, received) {
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

const IEX_URL = `https://sandbox.iexapis.com/stable/`;
function getStock(args, received) {
    if(args.length){
        if (args.length === 1) {
            const quoteURL = IEX_URL + `stock/${args[0]}/quote?token=${IEX_API}`;
            axios.get(quoteURL)
                .then((res) => {
                    let stock = res.data;
                    let update_time = new Date(stock.latestUpdate);
                    update_time = update_time.toLocaleDateString() + ' ' + update_time.toLocaleTimeString();

                    let stockInfo = `${stock.companyName} [${stock.symbol}] is trading at $${stock.latestPrice} (${stock.changePercent}%) \n
                    It opened at $${stock.open}. \n
                    US Market is currently ${stock.isUSMarketOpen ? "open" : "closed"}. Last updated ${update_time}.
                    `;
                    received.channel.send(stockInfo);
                }).catch(error => {
                    console.log(error);
                });
        }
    }
}

client.login(DISCORD_API); // Log into discord server