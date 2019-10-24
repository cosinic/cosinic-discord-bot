const BANK = require('./currency.js');
const PUNISHMENTS = require('./punishments');
const CURRENCY = 'Cosinic Coin';

const TAX_RATE = .15;
const COSTS = {
    "bamboozle": 1500
}

var SPLURGE = {
    //!cc bamboozle @user
    handleCommand(args, received) {
        if (args && args[0] === "spend" || !args[1]) {
            HELP_COMMANDS.helpSpend("spend", received);
            return;
        }
        let type = args[0];
        let who = args[1];
        let userId = received.author.id;
        let guildId = received.guild.id;
        if (args) {
            switch (type) {
                case "bamboozle":
                    if (who === "help") {
                        HELP_COMMANDS.helpSpend("bamboozle", received);
                        return;
                    }
                    this.bamboozleUser(userId, guildId, who)
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
    async bamboozleUser(userId, guildId, who) {
        if (who) {
            let bamboozleId = who;
            if (bamboozleId.match(/<@!?[0-9]+>/) === null) {
                return Promise.reject("Invalid user to bamboozle.");
            } else {
                bamboozleId = bamboozleId.match(/<@!?([0-9]+)>/)[1];
            }

            if (bamboozleId === client.user.id) {
                return Promise.reject(`Nice try but you can't bamboozle me.`);
            }

            return BANK.withdrawFromUser(userId, COSTS.bamboozle)
                .then(x => {
                    BANK.depositToBot(COSTS.bamboozle); // Money goes to bank
                    let bbzlAmount = PUNISHMENTS.addPunishment(userId, guildId, "bamboozle");
                    return Promise.resolve(`:smiling_imp: <@${bamboozleId}> is now being bamboozled for ${bbzlAmount} messages.`);
                }).catch(err => {
                    return Promise.reject(`Not enough money in your account.\nIt costs ${COSTS["bamboozle"]} ${formatCurrency(COSTS["bamboozle"])} to bamboozle someone.`);
                });
        }
    }
}

function sanitizeAmount(amount) {
    if (amount > Number.MAX_SAFE_INTEGER) {
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

module.exports = SPLURGE;