const crypto = require("crypto");
const DICE_EMOJI = ':game_die:'; // Discord dice emoji

var DICEROLL_COMMANDS = {
    handleCommand(primary, args, received) {
        if (args && args[0] === "help") {
            HELP_COMMANDS.help("diceroll", received);
            return;
        }

        //Default d6
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
                received.channel.send(`${DICE_EMOJI}:interrobang: ${err}`);
            });
    },
    displayRoll(number, received) {
        let whoRolled = received.author.username;
        received.channel.send(`${DICE_EMOJI} ${whoRolled} rolled: ${number}`);
    }
}

async function getRoll(minimum, maximum) {
    var distance = maximum - minimum;
    if (minimum < 1) {
        return Promise.reject('Minimum number must be greater than 0');
    }
    if (minimum >= maximum) {
        return Promise.reject('Minimum number should be less than maximum');
    } else if (distance > 281474976710655) {
        return Promise.reject('You can not get all possible random numbers if range is greater than 256^6-1');
    } else if (maximum > Number.MAX_SAFE_INTEGER) {
        return Promise.reject('Maximum number should be below safe integer limit');
    } else {
        var maxBytes = 6;
        var maxDec = 281474976710656;

        if (distance < 256) {
            maxBytes = 1;
            maxDec = 256;
        } else if (distance < 65536) {
            maxBytes = 2;
            maxDec = 65536;
        } else if (distance < 16777216) {
            maxBytes = 3;
            maxDec = 16777216;
        } else if (distance < 4294967296) {
            maxBytes = 4;
            maxDec = 4294967296;
        } else if (distance < 1099511627776) {
            maxBytes = 4;
            maxDec = 1099511627776;
        }

        var randbytes = await parseInt(crypto.randomBytes(maxBytes).toString('hex'), 16);
        var result = Math.floor(randbytes / maxDec * (maximum - minimum + 1) + minimum);

        if (result > maximum) {
            result = maximum;
        }
        return result;
    }
}

module.exports = DICEROLL_COMMANDS;