const BANK = require('./currency.js');
const PUNISHMENTS = require('./punishments');

const CONSTANTS = require('./constants');

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
        if (!received.guild.available) {
            received.channel.send(`You can only bamboozle someone inside a server. DM's are not possible.`);
            return;
        }
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

            return BANK.withdrawFromUser(userId, CONSTANTS.INVENTORY.bamboozle)
                .then(x => {
                    BANK.depositToBot(CONSTANTS.INVENTORY.bamboozle); // Money goes to bank
                    let bbzlAmount = PUNISHMENTS.addPunishment(bamboozleId, guildId, "bamboozle");
                    return Promise.resolve(`:smiling_imp: <@${bamboozleId}> is now being bamboozled for ${bbzlAmount} messages.`);
                }).catch(err => {
                    return Promise.reject(`Not enough money in your account.\nIt CONSTANTS.INVENTORY ${CONSTANTS.INVENTORY["bamboozle"]} ${CONSTANTS.formatCurrency(CONSTANTS.INVENTORY["bamboozle"])} to bamboozle someone.`);
                });
        }
    }
}

module.exports = SPLURGE;