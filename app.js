require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const DISCORD_API = process.env.BOT_SECRET;

client.on('ready', () => {
    console.log("Bot is running");
    client.user.setStatus('available');
    client.user.setPresence({
        game: {
            name: 'for ! in Cosinic',
            type: "WATCHING"
        }
    });
});

const punishments = require('./currency/punishments.js');

client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) { // Prevent bot from responding to its own messages
        return
    }

    if (receivedMessage.author.bot) { // Prevent bot from responding to other bots
        return;
    }

    if (receivedMessage.content.startsWith("!")) {
        processCommand(receivedMessage);
    } else {
        punishments.checkPunishments(receivedMessage);
    }
});

client.login(DISCORD_API); // Log into discord server

global.client = client; // Puts Discord Client into global scope
const help_commands = require('./commands/help.js');
global.HELP_COMMANDS = help_commands; // Help commands into global scope

const riot_commands = require('./commands/riot.js');
const stock_commands = require('./commands/stock.js');
const crypto_commands = require('./commands/crypto.js');
const reddit_commands = require('./commands/reddit.js');
const weather_commands = require('./commands/weather.js');
const roll_commands = require('./commands/diceroll.js');
const BANK = require('./currency/currency.js');
const moderation_commands = require('./commands/moderation');

function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading exclamation mark
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the exclamation is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    switch (primaryCommand) {
        case 'lolstats':
            riot_commands.stats(arguments, receivedMessage);
            break;
        case 'lolsucks':
            riot_commands.sucks(arguments, receivedMessage);
            break;
        case 'stock':
        case 'stocks':
            stock_commands.handleCommand(arguments, receivedMessage);
            break;
        case 'stonk':
        case 'stonks':
            stock_commands.getStonk(arguments, receivedMessage);
            break;
        case 'crypto':
        case 'crypt':
            crypto_commands.getCurrency(arguments, receivedMessage);
            break;
        case 'reddit':
        case 'redsched':
            reddit_commands.handleCommand(arguments, receivedMessage);
            break;
        case 'weather':
            weather_commands.handleCommand(arguments, receivedMessage);
            break;
        case 'd':
        case String(primaryCommand.match(/d\d{1,3}/)): //Matches d[0-9]{1-3 digits}
            roll_commands.handleCommand(primaryCommand, arguments, receivedMessage);
            break;
        case 'weatherweek':
            weather_commands.week(arguments, receivedMessage);
            break;
        case 'cc':
            BANK.handleCommand(arguments, receivedMessage);
            break;
        case 'mod':
        case 'mode': // Because my brain keeps typing mode
            moderation_commands.handleCommand(arguments, receivedMessage);
            break;
        default:
            break;
    }
}