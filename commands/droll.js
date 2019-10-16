const crypto = require("crypto");
const {
    promisify
} = require('util');

const DICE_EMOJI = ':game_die:'; // Discord dice emoji

const MAX_VAL = Buffer.from("ffffffffffff", "hex").readUIntBE(0, 6); // 2^(6*8) - 1
const defaultGetRandomBytes = promisify(crypto.randomBytes);

var DROLL_COMMANDS = {
    handleCommand(primary, args, received) {
        if (args && args[0] === "help") {
            HELP_COMMANDS.help("droll", received);
            return;
        }
        if (primary === 'd') {

        } else {
            let rollNumber = primary.match(/d(\d{1,3})/)[1];
            getRoll(1, rollNumber)
                .then(num => {
                    this.displayRoll(num, received);
                });
        }
    },
    displayRoll(number, received) {
        let whoRolled = received.author.username;
        received.channel.send(`${DICE_EMOJI} ${whoRolled} rolled: ${number}`);
    }
}
async function internalRandomRange(bound, getRandomBytes = defaultGetRandomBytes) {
    if (bound > MAX_VAL) throw new ArgumentError(`bound must be <= ${MAX_VAL}`);
    const range = bound - 1;
    const excess = MAX_VAL % range;
    const randLimit = MAX_VAL - excess;

    while (true) {
        const x = (await getRandomBytes(6)).readUIntBE(0, 6);
        if (x > randLimit) continue;
        return x % range;
    }
}

async function getRoll(min, bound) {
    if (![min, bound].every(Number.isInteger))
        throw new ArgumentError("min and bound must be integers");
    if (min >= bound) {
        throw new ArgumentError("min must be >= bound");
    }
    const k = bound - min;
    const n = await internalRandomRange(k, getRandomBytes);
    return n + min;
}

module.exports = DROLL_COMMANDS;