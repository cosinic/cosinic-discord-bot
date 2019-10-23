var rand = require("random-number-csprng"); // https://www.npmjs.com/package/random-number-csprng
const DICE_EMOJI = ':game_die:'; // Discord dice emoji
const ERROR_EMOJI = ':interrobang:'; // Discord dice emoji

var DICEROLL_COMMANDS = {
    handleCommand(primary, args, received) {
        if (args && args[0] === "help") {
            HELP_COMMANDS.help("diceroll", received);
            return;
        }

        let min_roll = 1,
            max_roll = 6;
        if (primary === 'd') { // If it's a format like !d [MAX]
            if (args[1]) { // It has a min and max
                min_roll = parseInt(args[0]);
                max_roll = parseInt(args[1]);
            } else {
                max_roll = parseInt(args[0]);
            }
        } else { // Otherwise it's a !d[NUM]
            let rollNumber = primary.match(/d(\d{1,3})/)[1]; // Gets the number that comes after !d
            max_roll = parseInt(rollNumber);
        }

        getRoll(min_roll, max_roll)
            .then(num => {
                this.displayRoll(num, received);
            }).catch(err => {
                received.channel.send(`${DICE_EMOJI}${ERROR_EMOJI} ${err}`);
            });
    },
    async runRoulette() {
        return await getRoll(0, 37)
            .then(num => {
                return num;
            }).catch(err => {
                return err;
            });
    },
    displayRoll(number, received) {
        let whoRolled = received.author.username;
        received.channel.send(`${DICE_EMOJI} ${whoRolled} rolled: ${number}`);
    }
}

async function getRoll(minimum, maximum) {
    var distance = maximum - minimum;
    if (minimum < 0) {
        return Promise.reject('Minimum number must be a positive number');
    }
    if (isNaN(minimum) || isNaN(maximum)) {
        return Promise.reject('Invalid input');
    }
    if (minimum >= maximum) {
        return Promise.reject('Minimum number should be less than maximum');
    } else if (distance > 281474976710655) {
        return Promise.reject('You can not get all possible random numbers if range is greater than 256^6-1');
    } else if (maximum > Number.MAX_SAFE_INTEGER) {
        return Promise.reject('Maximum number should be below safe integer limit');
    } else {
        return await rand(minimum, maximum);
    }
}

module.exports = DICEROLL_COMMANDS;