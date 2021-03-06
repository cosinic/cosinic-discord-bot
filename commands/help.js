const CONSTANTS = require('../currency/constants');

var HELP_COMMANDS = {
    help(args, received) {
        if (args.length > 0) {
            let help_text = '';
            switch (args) {
                case 'lolstats':
                    help_text = "You can use this command like: `!lolstats [SUMMONER_USERNAME]`";
                    break;
                case 'stock':
                    help_text = "You can use this command like: `!stock [TICKER] (optional)[info|NUM_MONTHS]`";
                    break;
                case 'crypto':
                    help_text = "You can use this command like: `!crypto [SYMBOL] (optional)[info]`";
                    break;
                case 'reddit':
                    help_text = `You can use this command like: \`!reddit [SUBREDDIT] [stop|now|time in HH:MM format 24 hour standard(multiple times separated by commas)] (optional:default=hot)[hot|top|rising]\`.`;
                    help_text += `\nE.G: \`!reddit funny 17:00 top\` will post the top reddit post from /r/funny at 5:00PM EST daily.`;
                    help_text += `\nE.G: \`!reddit funny now top\` will post the top reddit post instantly.`;
                    break;
                case 'weather':
                    help_text = "You can use this command like: `!weather (optional)[tomorrow|week|schedule|set|default] (optional:default=I)[UNIT(M=Metric|S=Scientific|I=Imperial)] [CITY_NAME]`";
                    help_text += "\nE.G. `!weather New Brunswick, NJ` will display the current weather in New Brunswick.";
                    help_text += "\nE.G. `!weather set|default East Brunswick, NJ` will make East Brunswick your default location. Next time you can just do `!weather` and it'll post current weather for default.";
                    help_text += "\nE.G. `!weather week M East Brunswick, NJ` will display a 7 day forecast in METRIC units for East Brunswick.";
                    help_text += "\nE.G. `!weather schedule Pittsburg, PA` will schedule the bot to post the weather daily at 7 AM and the next day's forecast at 10 PM for Pittsburg.";
                    help_text += "\nWhen using `schedule` if you DM the bot, it will DM you. If you type it in a channel, it will post on that channel.";
                    break;
                case 'diceroll':
                    help_text = "You can use this command like: `!d [NUMBER]` or `!d[1-999]` or `!d [MIN] [MAX]`";
                    break;
                case 'cc':
                    help_text = "You can use this command like: `!cc [balance|pay|games] @TAG_A_USER [AMOUNT]`";
                    help_text += "\nE.G. `!cc pay @bob 5`";
                    help_text += "\nNote: You can DM the Bot `!cc balance` if you'd like to know your balance in private.";
                    break;
                case 'moderation':
                    help_text = "You can use this command like: `!mod [del] (bot) [AMOUNT]`";
                    help_text += "\nE.G. `!mod del 5` will delete 5 newest messages that you wrote.";
                    help_text += "\nE.G. `!mod del bot 5` will delete the newest 5 messages that the bot sent.";
                    break;
                case 'reminder':
                    help_text = "You can use this command like: `!remindme TIME_OPTION \"YOUR_MESSAGE_IN_DOUBLE_QUOTES\"`";
                    help_text += "\nE.G. `!remindme tonight \"Custom Valorant at 10 PM\"`";
                    help_text += "\nE.G. `!remind \"@Valorant Ivan's match is on\" tomorrow at 5 PM`";
                    help_text += "\nYou can also see and delete your reminders by typing `!remind (ls|show|list|del|delete)`";
                    break;
                default:
                    break;
            }
            received.channel.send(help_text);
        } else {
            received.channel.send("I'm not sure what you need help with. Try `![topic] help`")
        }
    },
    helpGames(args, received) {
        if (args.length > 0) {
            let help_text = '';
            switch (args) {
                case 'games':
                    help_text = `You can play games by typing \`!cc [GAME] [GAME_OPTIONS]\``;
                    help_text += "\nCurrent Games:\nRoulette (Type `!cc roulette help` for more info)";
                    break;
                case 'roulette':
                    help_text = `You can play roulette by typing \`!cc roulette [AMOUNT_TO_BET | all | half] [(ROULETTE_OPTIONS)|ROULETTE_NUMBER]\`.`;
                    help_text += `\nROULETTE_OPTIONS are: \`[even | odd | red | black | 1-18 | 19-36 | 1-12 | 13-24 | 25-36]\``;
                    break;
                default:
                    help_text = "I'm not sure what you need help with. Try `![topic] help`";
                    break;
            }
            received.channel.send(help_text);
        } else {
            received.channel.send("I'm not sure what you need help with. Try `![topic] help`")
        }
    },
    helpSpend(args, received) {
        if (args.length > 0) {
            let help_text = '';
            switch (args) {
                case 'spend':
                    help_text = `You can spend ${CONSTANTS.formatCurrency(0)} by typing \`!cc [BOT_INVENTORY] [PARAMETERS]\``;
                    help_text += "\nCurrent Inventory:";
                    help_text += "\nBamboozle (Type `!cc bamboozle help` for more info)";
                    break;
                case 'bamboozle':
                    help_text = `You can bamboozle someone by typing \`!cc bamboozle @TAG_A_USER\`.`;
                    help_text += ` Their messages will be replaced with a good ol bamboozle.`;
                    help_text += `\nIt costs ${CONSTANTS.INVENTORY.bamboozle} ${CONSTANTS.formatCurrency(CONSTANTS.INVENTORY.bamboozle)} to bamboozle someone.`;
                    break;
                default:
                    help_text = "I'm not sure what you need help with. Try `![topic] help`";
                    break;
            }
            received.channel.send(help_text);
        } else {
            received.channel.send("I'm not sure what you need help with. Try `![topic] help`")
        }
    }
}

module.exports = HELP_COMMANDS;