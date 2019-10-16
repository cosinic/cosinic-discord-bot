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
                case 'droll':
                    help_text = "You can use this command like: `!d [NUMBER]` or `!d[4|6|8|10|12|20|100]` or `!d [MIN] [MAX]`";
                    break;
                default:
                    break;
            }
            received.channel.send(help_text);
        } else {
            received.channel.send("I'm not sure what you need help with. Try `![topic] help`")
        }
    }
}

module.exports = HELP_COMMANDS;