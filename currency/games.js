const ROULETTE = require('./roulette.js');
const BANK = require('./currency.js');
const CURRENCY = 'Cosinic Coin';

const TAX_RATE = .15;

var GAMES = {
    //!cc roulette [AMOUNT] [args]
    handleCommand(args, received) {
        if (args && args[0] === "help" || !args[1]) {
            HELP_COMMANDS.helpGames("games", received);
            return;
        }
        let game = args[0];
        let amount = sanitizeAmount(args[1]);
        let arg_one_raw = args[1];
        args = args.slice(2);
        let userId = received.author.id;
        if (args) {
            switch (game) {
                case "bet":
                    break;
                case "roulette":
                    if (arg_one_raw === "help") {
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
        let userBalance = BANK.getRawBalance(userId);
        if (amount === 0) {
            return Promise.reject(`You need to bet at least .01 ${formatCurrency(1)}`);
        }
        if (amount > userBalance) {
            return Promise.reject(`You cannot bet more than you have in your account.`);
        }
        BANK.withdrawFromUser(userId, sanitizeAmount(amount));

        return await ROULETTE.bet(args)
            .then(result => {
                if (result.win) {
                    let multiplyer = result.multiplyer;
                    let payout = sanitizeAmount(amount * multiplyer * (1 - TAX_RATE));
                    BANK.depositToUser(userId, payout);
                    BANK.depositToBot(sanitizeAmount(payout * TAX_RATE)); // Give Bank outside 15% of earnings (for Dividends/Rewards Pool)
                    return Promise.resolve(`Ball Landed On: ${result.number} (${result.color})\n:money_mouth: Congratulations <@${userId}>, you won ${payout} ${formatCurrency(payout)} *(Tax: ${TAX_RATE * 100}%)*`);
                } else {
                    BANK.depositToBot(sanitizeAmount(amount));
                    return Promise.resolve(`Ball Landed On: ${result.number} (${result.color})\n:money_with_wings: Better luck next time, <@${userId}>.`);
                }
            }).catch(err => {
                return Promise.reject(err);
            })
    }
}

function sanitizeAmount(amount) {
    if(amount > Number.MAX_SAFE_INTEGER){
        return 0;
    }
    if ((amount % (!isNaN(parseFloat(amount))) >= 0) && 0 <= ~~amount) {
        return Math.round(amount * 100) / 100;
    }
    return 0;
}


function formatCurrency(amount) {
    return `${CURRENCY}${amount !== 1 ? "s" : ""}`;
}

module.exports = GAMES;