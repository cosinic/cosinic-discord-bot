require('dotenv').config();

var MODERATION_COMMANDS = {
    handleCommand(args, received) {
        if (args.length) {
            if (args[0] === "help") {
                HELP_COMMANDS.help("moderation", received);
                return;
            }

            const userId = received.author.id;
            switch (args[0]) {
                case "delete":
                case "del":
                    this.deleteMessages(userId, args.slice(1), received);
                    return;
            }
        }
    },
    deleteMessages(userId, args, received) {
        if (args[0]) {
            let toDeleteAmount = args[0];
            let toDeleteId = userId;

            if (args[0].match(/<@!?[0-9]+>/) !== null) {
                if (args[0].match(/<@!?([0-9]+)>/)[1] !== userId) {
                    const notAvailableYetMessage = `You cannot delete other people's messages. Yet...`;
                    received.channel.send(notAvailableYetMessage)
                        .then(msg => {
                            queueDeleteMessage(msg);
                            queueDeleteMessage(received);
                        });
                    return;
                }
            }

            if (args[1]) {
                if (args[0] === "bot") {
                    toDeleteId = client.user.id;
                }
                // In the future maybe allow deleting other user's messages.
                // else if (args[0].match(/<@!?[0-9]+>/) === null) {
                //     toDeleteId = userId;
                // } else {
                //     toDeleteId = args[0].match(/<@!?([0-9]+)>/)[1];
                // }
                toDeleteAmount = args[1] ? parseInt(args[1]) : 10;
            } else {
                toDeleteAmount = parseInt(args[0]) || 10;
            }

            if (toDeleteAmount > 50) { // Limit to max 50 message deletes.
                toDeleteAmount = 50;
            }

            const channel = received.channel;

            if (channel.type === "text" || channel.type === "dm" || channel.type === "group") {
                if (toDeleteId === userId) {
                    toDeleteAmount++; // Because it counts the sent !mod del command as well.
                }
                channel.fetchMessages()
                    .then(messages => {
                        const toDeleteMessages = messages.filter(m => m.author.id === toDeleteId).first(toDeleteAmount);
                        if (toDeleteMessages.length) {
                            channel.bulkDelete(toDeleteMessages)
                                .then(messages => {
                                    const deleteCount = toDeleteId === userId ? messages.size - 1 : messages.size;
                                    const doneMessage = `<@${userId}> deleted ${deleteCount} ${deleteCount === 1 ? "message" : "messages"} by <@${toDeleteId}>.`;
                                    received.channel.send(doneMessage)
                                        .then(msg => {
                                            if (!received.deleted) {
                                                queueDeleteMessage(received);
                                            }
                                            queueDeleteMessage(msg);
                                        });
                                })
                                .catch(console.error);
                        } else {
                            const doneMessage = `No messages found to delete. Bot can only delete messages up to 2 weeks old.`;
                            received.channel.send(doneMessage)
                                .then(msg => {
                                    queueDeleteMessage(msg);
                                    queueDeleteMessage(received);
                                });
                        }
                    })
                    .catch(console.error);
            }
        } else {
            received.channel.send("Invalid format.");
            HELP_COMMANDS.help("moderation", received);
        }
    }
}

async function queueDeleteMessage(message) {
    const wait_seconds = 10;
    const wait_milliseconds = wait_seconds * 1000;

    const delay = ms => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    const delayMessage = cb => {
        return delay(wait_milliseconds).then(() => {
            cb();
        });
    }

    return await delayMessage(() => {
        if (message.deletable) {
            message.delete()
                .then(msg => {
                    return true;
                })
                .catch(console.error);
        } else {
            return false;
        }
    });
}

module.exports = MODERATION_COMMANDS;