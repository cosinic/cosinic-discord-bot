const DICE_COMMANDS = require('../commands/diceroll.js');

const MULTIPLYER = {
    "even": 2,
    "odd": 2,
    "red": 2,
    "black": 2,
    "1-18": 2,
    "19-36": 2,
    "1-12": 3,
    "13-24": 3,
    "25-36": 3,
    "split": 18, //Double | any two adjoining numbers vertical or horizontal
    "street": 12, //Triple | any three numbers horizontal (1,2,3 or 4,5,6 ...)
    "corner": 9, //Quadruple | any four adjoining numbers in a block
    "sixline": 6, //Sextuple | any six numbers from two horizontal rows
    "single": 36,
    "00": 36,
}

const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const BASIC_BOARD = createRouletteBoard();

var ROULETTE = {
    async bet(args) {
        let format = args[0];
        let spunNumber = await DICE_COMMANDS.runRoulette();
        let bet_type = format;
        let win = false;
        if (spunNumber === 37) { // 37th is "00"
            spunNumber = "00";
        }
        switch (format) {
            case "even":
                if (spunNumber % 2 === 0) {
                    win = true;
                }
                break;
            case "odd":
                if (spunNumber % 2 !== 0) {
                    win = true;
                }
                break;
            case "red":
                if (REDS.indexOf(spunNumber) > -1) {
                    win = true;
                }
                break;
            case "black":
                if (BLACKS.indexOf(spunNumber) > -1) {
                    win = true;
                }
                break;
            case "1-18":
                if (spunNumber >= 1 && spunNumber <= 18) {
                    win = true;
                }
                break;
            case "19-36":
                if (spunNumber >= 19 && spunNumber <= 36) {
                    win = true;
                }
                break;
            case "1-12":
                if (spunNumber >= 1 && spunNumber <= 12) {
                    win = true;
                }
                break;
            case "13-24":
                if (spunNumber >= 13 && spunNumber <= 24) {
                    win = true;
                }
                break;
            case "25-36":
                if (spunNumber >= 25 && spunNumber <= 36) {
                    win = true;
                }
                break;
            case "00":
                if (spunNumber === "00") {
                    win = true;
                }
                break;
            default: //Default is a single number
                bet_type = "single";
                let bet = parseInt(format);
                if (isNaN(format)) {
                    return Promise.reject(`Error in roulette options format`);
                }
                if (bet > 36) {
                    return Promise.reject(`Error: Roulette table goes from 0 - 36`);
                }
                if (bet === spunNumber) {
                    win = true;
                }
                break;
        }
        let color = REDS.indexOf(spunNumber) > -1 ? "Red" : BLACKS.indexOf(spunNumber) > -1 ? "Black" : "Green";
        if (win) {
            return Promise.resolve({
                "win": true,
                "multiplyer": MULTIPLYER[bet_type],
                "number": spunNumber,
                "color": color
            });
        }
        return Promise.resolve({
            "win": false,
            "multiplyer": 0,
            "number": spunNumber,
            "color": color
        });
    }
}

/**
 * This will create a 3 by 12 board
 * [1,4,7...]
 * [2,5,8...]
 * [3,6,9...]
 */
function createRouletteBoard() {
    let board = [];
    for (let columns = 0; columns < 3; columns++) {
        board.push([]);
    }
    for (let i = 1; i < 37; i++) {
        let index = i % 3;
        index = index === 0 ? 2 : index - 1;
        board[index].push(i);
    }
    return board;
}


module.exports = ROULETTE;