var HELP_COMMANDS = {
    help(args, received) {
        if (args.length > 0) {
            switch (args.join(' ')) {
                case 'lolstats':
                    received.channel.send("You can use this command like: `!lolstats [SUMMONER_USERNAME]`");
                    break;
                case 'stock':
                    received.channel.send("You can use this command like: `!stock [TICKER] [info|NUM_MONTHS]`");
                    break;
                case 'redsched':
                    received.channel.send("You can use this command like: `!redsched [SUBREDDIT] [Time in HH:MM format 24 hour standard (multiple times separated by commas)] [top|hot|rising]`. \nFor example: `!redscehd funny 17:00 top` will post the top reddit post from /r/funny at 5:00PM EST daily.");
                    break;
                default:
                    break;
            }
        } else {
            received.channel.send("I'm not sure what you need help with. Try `!help [topic]`")
        }
    }
}

module.exports = HELP_COMMANDS;