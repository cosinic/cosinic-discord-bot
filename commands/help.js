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
                default:
                    break;
            }
        } else {
            received.channel.send("I'm not sure what you need help with. Try `!help [topic]`")
        }
    }
}

module.exports = HELP_COMMANDS;