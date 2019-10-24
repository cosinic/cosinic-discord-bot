require('dotenv').config();
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
const CONSTANTS = require('./constants');

var punishments = new JsonDB(new JsonDBConfig("db/punishments", true, false, '/'));

/**
 * Punishment Layout
 * {
 * * punish {
 * * * userId {
 * * * * PUNISHMENT_TYPE {
 * * * * * guildId
 * * * * * amount
 * * * * }
 * * *}
 * * }
 * }
 */

var PUNISHMENT_COMMANDS = {
    checkPunishments(received) {
        let userId = received.author.id;
        if (!received.guild.available) { // Was not part of a server.
            return;
        }
        let guildId = received.guild.id;

        if (userId === client.user.id || received.author.bot) { //Can't punish bots
            return;
        }

        try {
            let userPunishments = punishments.getData(`/punish/${userId}`);
            Object.keys(userPunishments).forEach(punishment => {
                if (userPunishments[punishment].guildId === guildId && userPunishments[punishment].amount > 0) {
                    if (runPunishments[punishment](received)) {
                        subtractPunishment(userId, punishment);
                    }
                }
            });
        } catch (err) {
            // No punishment for this user
        }

    },
    addPunishment(toPunishId, guildId, type) {
        return addPunishment(toPunishId, guildId, type);
    }
}

const BAMBOOZLE_WORDS = ["By the way, I'm a complete dumbass",
    "Also, I suck at everything",
    "I'm an idiot sandwich",
    "I have a really small PP",
    "I support Trump and his actions",
    "I like spoons",
    "Sometimes I like to sniff glue",
];

var runPunishments = {
    bamboozle: function (received) {
        let originalMessage = received.content;

        let getBamboozle = () => {
            return BAMBOOZLE_WORDS[Math.floor(Math.random() * BAMBOOZLE_WORDS.length)];
        }

        let newMessage = originalMessage + (originalMessage[originalMessage.length - 1] !== '.' ? '. ' : ' ') + getBamboozle();
        if (received.deletable) {
            received.delete()
                .then(msg => {
                    received.channel.send(`<@${received.author.id}> says: ${newMessage}`);
                })
                .catch(console.error);
            return true;
        } else {
            return false;
        }
    }
}

function addPunishment(userId, guildId, type) {
    try { //Increase interval if they are already being punished
        let userPunishment = punishments.getData(`/punish/${userId}/${type}`);
        let newAmount = CONSTANTS.sanitizeAmount(userPunishment.amount + CONSTANTS.PUNISH_COUNTS[type]);
        punishments.push(`/punish/${userId}/${type}/amount`, newAmount);
        return newAmount;
    } catch (err) { //Has no punishment so create for them
        punishments.push(`/punish/${userId}/${type}`, {
            amount: CONSTANTS.PUNISH_COUNTS[type],
            guildId: guildId
        });
        return CONSTANTS.PUNISH_COUNTS[type];
    }
}

function subtractPunishment(userId, type) {
    try {
        let userPunishment = punishments.getData(`/punish/${userId}/${type}`);
        let newAmount = CONSTANTS.sanitizeAmount(userPunishment.amount - 1);
        punishments.push(`/punish/${userId}/${type}/amount`, newAmount);
        if (newAmount <= 0) {
            deletePunishment(userId, type);
        }
    } catch (err) {
        // Not found
    }
}

function deletePunishment(userId, type) {
    try {
        let userPunishment = punishments.getData(`/punish/${userId}/${type}`);
        if (userPunishment.amount <= 0) { // If their amount of punishments is 0, remove that punishment
            punishments.delete(`/punish/${userId}/${type}`);
        }
        let otherPunishments = punishments.getData(`/punish/${userId}`);
        if (Object.keys(otherPunishments).length === 0) { // No other punishments found, so remove user from punishment db
            punishments.delete(`/punish/${userId}`);
        }
    } catch (err) {
        // Not found
    }
}

module.exports = PUNISHMENT_COMMANDS;