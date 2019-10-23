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
                case 'reddit':
                    help_text = `You can use this command like: \`!reddit [SUBREDDIT] [stop|now|time in HH: MM format 24 hour standard(multiple times separated by commas)] (optional:default=hot)[hot|top|rising]\`.
                    \nE.G: \`!reddit funny 17:00 top\` will post the top reddit post from /r/funny at 5:00PM EST daily.
                    \nE.G: \`!reddit funny now top\` will post the top reddit post instantly.`;
                    break;
                case 'weather':
                    help_text = "You can use this command like: `!weather (optional:default=I)[UNIT(M=Metric|S=Scientific|I=Imperial)] [CITY_NAME]`"
                    break;
                case 'diceroll':
                    help_text = "You can use this command like: `!d [NUMBER]` or `!d[1-999]` or `!d [MIN] [MAX]`";
                    break;
                case 'cc':
                    help_text = "You can use this command like: `!cc [balance|pay] @TAG_A_USER [AMOUNT]`";
                    help_text += "\nE.G. `!cc pay @bob 5`";
                    help_text += "\nNote: You can DM the Bot `!cc balance` if you'd like to know your balance in private.";
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
                    help_text += "\nCurrent GAMEs:\nRoulette (Type `!cc roulette help` for more info)";
                    break;
                case 'roulette':
                    help_text = `You can play roulette by typing \`!cc roulette [AMOUNT_TO_BET] [(ROULETTE_OPTIONS)|ROULETTE_NUMBER]\`.`;
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
    }
}

module.exports = HELP_COMMANDS;