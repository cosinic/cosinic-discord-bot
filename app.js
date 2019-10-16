require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const DISCORD_API = process.env.BOT_SECRET;

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
});

client.login(DISCORD_API); // Log into discord server

global.client = client;

const help_commands = require('./commands/help.js');
const riot_commands = require('./commands/riot.js');
const stock_commands = require('./commands/stock.js');
const reddit_commands = require('./commands/reddit.js');
const weather_commands = require('./commands/weather.js');

function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading exclamation mark
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the exclamation is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    switch (primaryCommand) {
        case 'help':
            help_commands.help(arguments, receivedMessage);
            break;
        case 'lolstats':
            riot_commands.stats(arguments, receivedMessage);
            break;
        case 'lolsucks':
            riot_commands.sucks(arguments, receivedMessage);
            break;
        case 'stock':
            stock_commands.getStock(arguments, receivedMessage);
            break;
        case 'stonk':
            stock_commands.getStonk(arguments, receivedMessage);
            break;
        case 'reddit':
            reddit_commands.handleSchedule(arguments, receivedMessage);
            break;
        case 'weather':
            weather_commands.today(arguments, receivedMessage);
            break;
        default:
            break;
    }
}