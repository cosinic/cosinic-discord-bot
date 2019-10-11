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
        switch (args.join(' ')) {
            case 'lolstats':
                received.channel.send("You can use this command like: `!lolstats [SUMMONER_USERNAME]`");
                break;
            case 'stock':
                received.channel.send("You can use this command like: `!stock [TICKER] [info|NUM_MONTHS]`");
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

const IEX_URL = `https://cloud.iexapis.com/stable/`;

function getStock(args, received) {
    if (args.length) {
        const TICKER = args[0];
        if (args.length === 1) {
            const quoteURL = IEX_URL + `stock/${TICKER}/quote?token=${IEX_API}`;
            axios.get(quoteURL)
                .then((res) => {
                    let stock = res.data;
                    let update_time = new Date(stock.latestUpdate);
                    update_time = update_time.toLocaleDateString() + ' ' + update_time.toLocaleTimeString();

                    let change_percent = stock.changePercent * 100;

                    let stockInfo = `${stock.companyName} **(${stock.symbol})** is trading at **$${stock.latestPrice.toLocaleString('en')}** (${change_percent > 0 ? "+" : ""}${change_percent.toFixed(2)}%) \n`;
                    if (stock.open)
                        stockInfo += `It opened at $${stock.open.toLocaleString('en')}. \n`;
                    if (stock.close)
                        stockInfo += `It closed at at $${stock.close.toLocaleString('en')}. \n`;
                    if (stock.low && stock.high)
                        stockInfo += `Today's low: $${stock.low.toLocaleString('en')}. Today's high: $${stock.high.toLocaleString('en')}. \n`;
                    stockInfo += `*US Market is currently ${stock.isUSMarketOpen ? "open" : "closed"}. Last updated ${update_time}.*`;

                    received.channel.send(stockInfo);
                }).catch(error => {
                    console.log(error);
                });
        } else {
            let optional_args = args[1];
            if (typeof optional_args === "string") {
                if (optional_args === "info") {
                    const companyURL = IEX_URL + `stock/${TICKER}/company?token=${IEX_API}`;
                    axios.get(companyURL)
                        .then((res) => {
                            let stock = res.data;
                            let stockInfo = `${stock.companyName} **(${stock.symbol})** is listed on the ${stock.exchange}. \n`;
                            stockInfo += `Current CEO is ${stock.CEO} and has ${stock.employees.toLocaleString('en')} employees. \n`;
                            stockInfo += `They are in the ${stock.industry} industry within the ${stock.sector} sector. \n`;
                            stockInfo += `Description: > ${stock.description} \n`;
                            stockInfo += `*<${stock.website}>*`;

                            received.channel.send(stockInfo);
                        }).catch(error => {
                            console.log(error);
                        });
                }
            }
        }
    }
}

client.login(DISCORD_API); // Log into discord server