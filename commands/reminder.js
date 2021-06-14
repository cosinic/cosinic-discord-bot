require("dotenv").config();
const chrono = require("chrono-node");
const JsonDB = require("node-json-db").JsonDB;
const JsonDBConfig = require("node-json-db/dist/lib/JsonDBConfig").Config;
const cron = require("node-cron");
const {v4: uuidv4} = require("uuid");

const REMINDERS = new JsonDB(
    new JsonDBConfig("db/reminders", true, false, "/")
);
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

const REMINDER_EMOJIS = {
    0: "0⃣",
    1: "1⃣",
    2: "2⃣",
    3: "3⃣",
    4: "4⃣",
    5: "5⃣",
    6: "6⃣",
    7: "7⃣",
    8: "8⃣",
    9: "9⃣",
};

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
                case "list":
                case "ls":
                case "show":
                case "get":
                    this.getReminders(received);
                    return;
                default:
                    this.setReminder(args, received);
                    return;
            }
        }
    },
    sendErrorMessage(received, message) {
        received.channel.send(message).then((msg) => {
            queueDeleteMessage(msg);
            queueDeleteMessage(received);
        });
        return;
    },
    getReminders(received) {
        const userId = received.author.id;
        const guildId = received.guild ? received.guild.id : null;
        const rems = getReminders(userId, guildId);
        if (rems.length) {
            const userReminders = [];
            for (const rid of rems) {
                const rem = getReminderById(rid);
                userReminders.push({
                    id: rid,
                    ...rem,
                });
            }
            received.channel
                .send(
                    "**React with the numbered emoji to delete the corresponding scheduled reminder.**"
                )
                .then((iMsg) => {
                    queueDeleteMessage(iMsg);
                });
            const formattedReminderString = formatReminders(userReminders);
            received.channel.send(formattedReminderString).then(async (msg) => {
                try {
                    for (let i = 0; i < userReminders.length; i++) {
                        await msg.react(REMINDER_EMOJIS[i]);
                    }
                    await msg.react("❌");
                    const filter = (reaction, user) => {
                        return (
                            [
                                "0⃣",
                                "1⃣",
                                "2⃣",
                                "3⃣",
                                "4⃣",
                                "5⃣",
                                "6⃣",
                                "7⃣",
                                "8⃣",
                                "9⃣",
                                "❌",
                            ].includes(reaction.emoji.name) &&
                            user.id === userId
                        );
                    };
                    msg.awaitReactions(filter, {
                        max: 1,
                        time: 30000,
                        errors: ["time"],
                    })
                        .then((collected) => {
                            const reaction = collected.first();
                            if (reaction.emoji.name === "❌") { // Then cancel and remove list
                                queueDeleteMessage(received);
                                msg.delete();
                                return;
                            }
                            const reactedNum = parseInt(reaction.emoji.name);
                            if (!isNaN(reactedNum)) {
                                const reminderToDelete =
                                    userReminders[reactedNum];
                                deleteReminder(reminderToDelete.id);
                                received.channel
                                    .send(
                                        `Okay, deleting your reminder scheduled for: *${new Date(
                                            reminderToDelete.time
                                        ).toLocaleDateString()}* about: \`${
                                            reminderToDelete.message
                                        }\``
                                    )
                                    .then((cMsg) => {
                                        queueDeleteMessage(cMsg);
                                    });
                            }
                            queueDeleteMessage(msg);
                            queueDeleteMessage(received);
                        })
                        .catch((collected) => {
                            queueDeleteMessage(received);
                            msg.delete();
                        });
                } catch (err) {
                    console.error("Emojis failed to react:", err);
                }
            });
        } else {
            this.sendErrorMessage(received, "You have no scheduled reminders.");
        }
    },
    setReminder(args, received) {
        const userId = received.author.id;
        const guildId = received.guild ? received.guild.id : null;
        const channelId = received.channel.id;

        // First check (or create) reminders to make sure they're under the limit
        const currentReminders = getReminders(userId, guildId);
        if (currentReminders.length > REMINDER_LIMIT) {
            const errorMessage = `Sorry but you can only schedule ${REMINDER_LIMIT} reminders in a server.`;
            this.sendErrorMessage(received, errorMessage);
            return;
        }

        // Get the indexes where the first char is " and last char is "
        const firstIndexMessage = args.findIndex((x) => x[0] === '"');
        const lastIndexMessage = args.findIndex((x) => x.slice(-1) === '"');
        const messageLength = lastIndexMessage - firstIndexMessage + 1; // We add one since index starts at 0
        // Make sure the indexes are in the right order.
        if (messageLength > 0) {
            const rawMessage = args.slice(
                firstIndexMessage,
                lastIndexMessage + 1
            );
            const REMINDER_MESSAGE = rawMessage.join(" ").replace(/\"/g, "").trim();

            // Don't need to get the mentioned ID's since the received message automatically translates to <@id>
            const messageMentions = received.mentions;
            if (messageMentions.everyone) {
                // However we should not store @everyone or @here for abuse avoidance.
                const errorMessage =
                    "You cannot set a reminder for `@everyone` or for `@here`.";
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
                timezones: "EST",
            });
            if (parsedDateResult.length) {
                const parsedDateTime = parsedDateResult.pop();

                const dateTimeStart = parsedDateTime.start;
                const jsDate = dateTimeStart.date();

                const newReminder = setNewReminder(
                    userId,
                    guildId,
                    channelId,
                    jsDate,
                    REMINDER_MESSAGE
                );
                if (newReminder !== false) {
                    received.channel
                        .send(
                            `Ok <@${userId}>, I'll remind you on **${jsDate.toLocaleDateString()} at ${jsDate.toLocaleTimeString()}** about *${REMINDER_MESSAGE}*`
                        )
                        .then((msg) => {
                            queueDeleteMessage(received);
                        });
                } else {
                    const errorMessage = `Something went wrong while creating this reminder. Please try again.`;
                    this.sendErrorMessage(received, errorMessage);
                }
            } else {
                const errorMessage = `Unable to parse your time option. Please try again.\nPlease use this format: \`!remind TIME_OPTION "YOUR_MESSAGE"\``;
                this.sendErrorMessage(received, errorMessage);
                return;
            }
        } else {
            const errorMessage = `Sorry, but you may have put more than one pair of the double apostrophe character.\nPlease use this format: \`!remind TIME_OPTION "YOUR_MESSAGE"\``;
            this.sendErrorMessage(received, errorMessage);
            return;
        }
    },
};

function getReminders(userId, guildId = null) {
    try {
        if (guildId !== null) {
            return REMINDERS.getData(`/guilds/${guildId}/${userId}/reminders`);
        }
        return REMINDERS.getData(`/users/${userId}/reminders`);
    } catch (err) {
        if (guildId !== null) {
            REMINDERS.push(`/guilds/${guildId}/${userId}`, {
                reminders: [],
            });
            return REMINDERS.getData(`/guilds/${guildId}/${userId}`);
        }
        REMINDERS.push("/users/" + userId, {
            reminders: [],
        });
        return REMINDERS.getData(`/users/${userId}`);
    }
}

function getReminderById(reminderId) {
    try {
        return REMINDERS.getData("/reminders/" + reminderId);
    } catch (err) {
        console.error(err);
        return false;
    }
}

/**
 *
 * @param {*} reminders | array of Reminders
 */
function formatReminders(reminders) {
    if (reminders.length) {
        let formatted = "```md\n";
        for (let i = 0; i < reminders.length; i++) {
            const rem = reminders[i];
            const remTime = new Date(rem.time);
            formatted += `${i}. (${remTime.toLocaleDateString()} at ${remTime.toLocaleTimeString()}) "${
                rem.message
            }"\n`;
        }
        formatted += "```";
        return formatted;
    }
    return "";
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
            done: false,
        };
        REMINDERS.push("/reminders/" + newId, reminder, true);
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
        const existing = REMINDERS.getData(
            `/cron/y${reminderDate.getFullYear()}/m${
                reminderDate.getMonth() + 1
            }/d${reminderDate.getDate()}`
        );
        if (existing.length) {
            REMINDERS.push(
                `/cron/y${reminderDate.getFullYear()}/m${
                    reminderDate.getMonth() + 1
                }/d${reminderDate.getDate()}[]`,
                reminderId,
                true
            );
        } else {
            throw new Error("No Reminders in Array, create new one");
        }
    } catch (err) {
        REMINDERS.push(
            `/cron/y${reminderDate.getFullYear()}/m${
                reminderDate.getMonth() + 1
            }/d${reminderDate.getDate()}[0]`,
            reminderId,
            true
        );
    }
}

function setNewReminder(userId, guildId = null, channelId, time, message) {
    try {
        const reminderId = createReminder(
            userId,
            guildId,
            channelId,
            time,
            message
        );
        if (reminderId) {
            if (guildId !== null) {
                REMINDERS.push(
                    `/guilds/${guildId}/${userId}/reminders[]`,
                    reminderId
                );
                return getReminderById(reminderId);
            }
            REMINDERS.push(`/users/${userId}/reminders[]`, reminderId);
            return getReminderById(reminderId);
        } else {
            throw new Error("Creating reminder failed");
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

function deleteReminder(reminderId) {
    try {
        const reminder = REMINDERS.getData("/reminders/" + reminderId);
        if (reminder !== null && reminder !== undefined) {
            console.log("Deleting Reminder:", reminderId);
            // Delete from cron
            const reminderDate = new Date(reminder.time);
            const crons = REMINDERS.getData(
                `/cron/y${reminderDate.getFullYear()}/m${
                    reminderDate.getMonth() + 1
                }/d${reminderDate.getDate()}`
            );
            const cronReminderIdx = crons.findIndex((x) => x === reminderId);
            if (cronReminderIdx > -1)
                REMINDERS.delete(
                    `/cron/y${reminderDate.getFullYear()}/m${
                        reminderDate.getMonth() + 1
                    }/d${reminderDate.getDate()}[${cronReminderIdx}]`
                );

            if (reminder.guildId !== null) {
                // Delete from guild
                const gReminders = REMINDERS.getData(
                    `/guilds/${reminder.guildId}/${reminder.userId}/reminders`
                );
                const gReminderIdx = gReminders.findIndex(
                    (x) => x === reminderId
                );
                if (gReminderIdx > -1)
                    REMINDERS.delete(
                        `/guilds/${reminder.guildId}/${reminder.userId}/reminders[${gReminderIdx}]`
                    );
            } else {
                // Delete from user
                const uReminders = REMINDERS.getData(
                    `/users/${reminder.userId}/reminders`
                );
                const uReminderIdx = uReminders.findIndex(
                    (x) => x === reminderId
                );
                if (uReminderIdx > -1)
                    REMINDERS.delete(
                        `/users/${reminder.userId}/reminders[${uReminderIdx}]`
                    );
            }
            // Delete from reminders
            REMINDERS.delete(`/reminders/${reminderId}`);
        }
    } catch (err) {
        console.error(err);
    }
}

async function queueDeleteMessage(message) {
    const wait_seconds = 10;
    const wait_milliseconds = wait_seconds * 1000;

    const delay = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const delayMessage = (cb) => {
        return delay(wait_milliseconds).then(() => {
            cb();
        });
    };

    return await delayMessage(() => {
        if (message.deletable) {
            message
                .delete()
                .then((msg) => {
                    return true;
                })
                .catch(console.error);
        } else {
            return false;
        }
    });
}

function sendReminderToChannel(rid, r) {
    const message = `Hey <@${r.userId}>, here's your reminder:\n${r.message}`;
    if (client.status === 0) {
        // Make sure bot is ready and connected
        client.channels
            .get(r.channelId)
            .send(message)
            .then((msg) => {
                deleteReminder(rid);
            });
    }
}

function SEND_REMINDERS() {
    try {
        const today = new Date();
        const remindersForToday = REMINDERS.getData(
            `/cron/y${today.getFullYear()}/m${
                today.getMonth() + 1
            }/d${today.getDate()}`
        );
        if (remindersForToday.length) {
            for (const rid of remindersForToday) {
                const rem = getReminderById(rid);
                if (rem) {
                    const now = new Date();
                    if (new Date(rem.time) <= now) {
                        sendReminderToChannel(rid, rem);
                    }
                }
            }
        }
    } catch (err) {
        if (err.message.indexOf("find dataPath") > -1) {
            // const today = new Date();
            // console.log("No Reminders Today:", today.toDateString());
        } else {
            console.error(err);
        }
    }
}

// Run every minute
SEND_REMINDERS();
cron.schedule(
    "* * * * *",
    () => {
        SEND_REMINDERS();
    },
    {
        timezone: "America/New_York",
    }
);

module.exports = REMINDER_COMMANDS;
