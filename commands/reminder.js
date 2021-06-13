require('dotenv').config();
const chrono = require('chrono-node');
const JsonDB = require('node-json-db').JsonDB;
const JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
const cron = require('node-cron');
const {
    v4: uuidv4
} = require('uuid');

const reminders = new JsonDB(new JsonDBConfig("db/reminders", true, false, '/'));
const REMINDER_LIMIT = 9;

/**
 * Reminder JsonDB Layout
 * {
 * * cron {
 * * * year {
 * * * * month {
 * * * * * day [reminderId]
 * * * * }
 * * *}
 * * }
 * * reminders [ ID: {
 * * * time
 * * * message
 * * * done
 * * * userId
 * * * guildId
 * * * channelId
 * * }]
 * * users {
 * * * userId {
 * * * * reminders [ id ]
 * * *}
 * * }
 * * guilds {
 * * * guildId {
 * * * * userId {
 * * * * * reminders [ id ]
 * * * }
 * * }
 * }
 */


const REMINDER_COMMANDS = {
    handleCommand(args, received) {
        if (args.length) {
            if (args[0] === "help") {
                HELP_COMMANDS.help("reminder", received);
                return;
            }

            switch (args[0]) {
                case "delete":
                case "del":
                    this.deleteReminder(args.slice(1), received);
                    return;
                case "list":
                case "show":
                    this.getReminders(received);
                    return;
                default:
                    this.setReminder(args, received);
                    return;
            }
        }
    },
    sendErrorMessage(received, message) {
        received.channel.send(message)
            .then(msg => {
                queueDeleteMessage(msg);
                queueDeleteMessage(received);
            });
        return;
    },
    getReminders(received) {
        const userId = received.author.id;
        const guildId = received.guild ? received.guild.id : null;
        const reminders = getReminders(userId, guildId);
        console.log(reminders);
    },
    setReminder(args, received) {
        const userId = received.author.id;
        const guildId = received.guild ? received.guild.id : null;
        const channelId = received.channel.id;

        // First check (or create) reminders to make sure they're under the limit
        const currentReminders = getReminders(userId, guildId);
        if (currentReminders.length > REMINDER_LIMIT) {
            const errorMessage = `Sorry but you can only set ${REMINDER_LIMIT} limits per group, per user.`;
            this.sendErrorMessage(received, errorMessage);
            return;
        }

        // Get the indexes where the first char is " and last char is "
        const firstIndexMessage = args.findIndex(x => x[0] === '"');
        const lastIndexMessage = args.findIndex(x => x.slice(-1) === '"');
        const messageLength = lastIndexMessage - firstIndexMessage + 1; // We add one since index starts at 0
        // Make sure the indexes are in the right order.
        if (messageLength > 0) {
            const rawMessage = args.slice(firstIndexMessage, lastIndexMessage + 1);
            const REMINDER_MESSAGE = rawMessage.join(' ').replace(/\"/g, '');

            // Don't need to get the mentioned ID's since the received message automatically translates to <@id>
            const messageMentions = received.mentions;
            if (messageMentions.everyone) { // However we should not store @everyone or @here for abuse avoidance.
                const errorMessage = 'You cannot set a reminder for `@everyone` or for `@here`.';
                this.sendErrorMessage(received, errorMessage);
                return;
            }

            // Shallow copy args incase we need it again
            const timeOptionRaw = [...args];
            // Get the rest of the message minus the reminder message
            timeOptionRaw.splice(firstIndexMessage, messageLength);
            const TIME_OPTION = timeOptionRaw.join(" ");

            // Use chrono-node to get the date (https://github.com/wanasit/chrono)
            const referenceDate = new Date();
            const parsedDateResult = chrono.parse(TIME_OPTION, referenceDate, {
                forwardDate: true,
                timezones: 'EST'
            });
            if (parsedDateResult.length) {
                const parsedDateTime = parsedDateResult.pop();

                const dateTimeStart = parsedDateTime.start;
                const jsDate = dateTimeStart.date();

                console.log(dateTimeStart);
                console.log(jsDate);

                const newReminder = setNewReminder(userId, guildId, channelId, jsDate, REMINDER_MESSAGE);
                if (newReminder !== false) {
                    console.log(newReminder);
                } else {
                    const errorMessage = `Something went wrong while creating this reminder. Please try again.`;
                    this.sendErrorMessage(received, errorMessage);
                }
            } else {
                const errorMessage = `Unable to parse your time option. Please try again.\nPlease use this format: \`!remind TIME_OPTION "YOUR_MESSAGE"\``
                this.sendErrorMessage(received, errorMessage);
                return;
            }

        } else {
            const errorMessage = `Sorry, but you may have put more than one pair of the double apostrophe character.\nPlease use this format: \`!remind TIME_OPTION "YOUR_MESSAGE"\``
            this.sendErrorMessage(received, errorMessage);
            return;
        }

    },
    deleteReminder(args, received) {
        const userId = received.author.id;
        const guildId = received.guild ? received.guild.id : null;

        if (args[0]) {
            let toDeleteAmount = args[0];
            let toDeleteId = userId;

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
                            this.sendErrorMessage(received, doneMessage);
                        }
                    })
                    .catch(console.error);
            }
        } else {
            received.channel.send("Invalid format.");
            HELP_COMMANDS.help("reminder", received);
        }
    }
}

function getReminders(userId, guildId = null) {
    try {
        if (guildId !== null) {
            return reminders.getData(`/guilds/${guildId}/${userId}/reminders`);
        }
        return reminders.getData(`/users/${userId}/reminders`);
    } catch (err) {
        if (guildId !== null) {
            reminders.push(`/guilds/${guildId}/${userId}`, {
                reminders: []
            });
            return reminders.getData(`/guilds/${guildId}/${userId}`);
        }
        reminders.push('/users/' + userId, {
            reminders: []
        });
        return reminders.getData(`/users/${userId}`);
    }
}

function getReminderById(reminderId) {
    try {
        return reminders.getData('/reminders/' + reminderId);
    } catch (err) {
        console.error(err);
    }
}

/**
 * 
 * @param {*} userId 
 * @param {*} guildId 
 * @param {*} channelId | needed for sending message to specific channel
 * @param {*} time 
 * @param {*} message 
 */
function createReminder(userId, guildId, channelId, time, message) {
    try {
        const newId = uuidv4();
        const reminderDate = new Date(time);
        const reminder = {
            userId: userId,
            guildId: guildId,
            channelId: channelId,
            time: time,
            message: message,
            done: false
        };
        reminders.push('/reminders/' + newId, reminder, true);
        addReminderToCron(reminderDate, newId);
        return newId;
    } catch (err) {
        console.error(err);
        return false;
    }
}

/**
 * Adds reminder to cron list so it's read to be reminded during that day.
 * @param {*} reminderDate | javascript datetime
 * @param {*} reminderId 
 */
function addReminderToCron(reminderDate, reminderId) {
    try {
        const existing = reminders.getData(`/cron/${reminderDate.getFullYear()}/${reminderDate.getMonth() + 1}/d${reminderDate.getDate()}`);
        if (existing.length) { // todo: Existing doesn't seem to be appending
            reminders.push(`/cron/${reminderDate.getFullYear()}/${reminderDate.getMonth() + 1}/d${reminderDate.getDate()}[]`, reminderId, true);
        }
    } catch (err) {
        reminders.push(`/cron/${reminderDate.getFullYear()}/${reminderDate.getMonth() + 1}/d${reminderDate.getDate()}[0]`, reminderId, true);
    }
}

function setNewReminder(userId, guildId = null, channelId, time, message) {
    try {
        const reminderId = createReminder(userId, guildId, channelId, time, message);
        if (reminderId) {
            if (guildId !== null) {
                reminders.push(`/guilds/${guildId}/${userId}/reminders[]`, reminderId);
                return getReminderById(reminderId);
            }
            reminders.push(`/users/${userId}/reminders[]`, reminderId);
            return getReminderById(reminderId);
        } else {
            throw new Error('Creating reminder failed');
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

function deleteReminder(reminderId) {
    try {
        const reminder = reminders.getData('/reminders/' + reminderId);
        if (reminder !== null && reminder !== undefined) {
            console.log("Deleting Reminder:", reminderId);
            // Delete from cron
            const reminderDate = new Date(reminder.time);
            const crons = reminders.getData(`/cron/${reminderDate.getFullYear()}/${reminderDate.getMonth() + 1}/d${reminderDate.getDate()}`);
            const cronReminderIdx = crons.findIndex(x => x === reminderId);
            if (cronReminderIdx > -1)
                reminders.delete(`/cron/${reminderDate.getFullYear()}/${reminderDate.getMonth() + 1}/d${reminderDate.getDate()}[${cronReminderIdx}]`);

            if (reminder.guildId !== null) {
                // Delete from guild
                const gReminders = reminders.getData(`/guilds/${reminder.guildId}/${reminder.userId}/reminders`);
                const gReminderIdx = gReminders.findIndex(x => x === reminderId);
                if (gReminderIdx > -1)
                    reminders.delete(`/guilds/${reminder.guildId}/${reminder.userId}/reminders[${gReminderIdx}]`);
            } else {
                // Delete from user
                const uReminders = reminders.getData(`/users/${reminder.userId}/reminders`);
                const uReminderIdx = uReminders.findIndex(x => x === reminderId);
                if (uReminderIdx > -1)
                    reminders.delete(`/users/${reminder.userId}/reminders[${uReminderIdx}]`);
            }
            // Delete from reminders
            reminders.delete(`/reminders/${reminderId}`);

        }
    } catch (err) {
        console.error(err);

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

function sendReminderToChannel(rid, r) {
    client.channels.get(r.channelId).send(r.message).then(msg => {
        deleteReminder(rid);
    });
}

function SEND_REMINDERS() {
    try {
        const reminderData = reminders.getData('/');
        if (typeof reminderData['reminders'] === 'undefined') {
            console.log("No Reminders in DB");
        } else {
            const REMINDERS = reminders.getData('/reminders');
            for (const rid in REMINDERS) {
                const current_reminder = REMINDERS[rid];
                console.log(current_reminder);
                deleteReminder(rid);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

// Run every minute
SEND_REMINDERS();
cron.schedule('* * * * *', () => {
    SEND_REMINDERS();
}, {
    timezone: "America/New_York"
});

module.exports = REMINDER_COMMANDS;