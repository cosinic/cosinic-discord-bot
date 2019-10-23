const ROULETTE = require('./roulette.js');
const BANK = require('./currency.js');
const CURRENCY = 'Cosinic Coin';

var GAMES = {
    //!cc roulette [AMOUNT] [args]
    handleCommand(args, received) {
        if (args && args[0] === "help" || !args[1]) {
            HELP_COMMANDS.helpGames("games", received);
            return;
        }
        let game = args[0];
        let amount = args[1];
        args = args.slice(2);
        let userId = received.author.id;
        if (args) {
            switch (game) {
                case "bet":
                    break;
                case "roulette":
                    if (amount === "help") {
                        HELP_COMMANDS.helpGames("roulette", received);
                        return;
                    }
                    this.playRoulette(userId, amount, args)
                        .then(msg => {
                            received.channel.send(msg);
                        }).catch(err => {
                            received.channel.send(err);
                        })
                    break;
                default:
                    break;
            }
        }
    },
    async playRoulette(userId, amount, args) {
        return await ROULETTE.bet(args)
            .then(result => {
                if (result.win) {
                    let multiplyer = result.multiplyer;
                    let payout = parseInt(amount) * multiplyer;
                    BANK.depositToUser(userId, payout);
                    return Promise.resolve(`Ball Landed On: ${result.number} (${result.color})\n:money_mouth: Congratulations <@${userId}>, you won ${payout} ${formatCurrency(payout)}`);
                } else {
                    BANK.withdrawFromUser(userId, parseInt(amount));
                    BANK.depositToBot(parseInt(amount));
                    return Promise.resolve(`Ball Landed On: ${result.number} (${result.color})\n:money_with_wings: Better luck next time, <@${userId}>.`);
                }
            }).catch(err => {
                return Promise.reject(err);
            })
    }
}

function formatCurrency(amount) {
    return `${CURRENCY}${amount !== 1 ? "s" : ""}`;
}

module.exports = GAMES;