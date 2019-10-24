const CURRENCY = "Cosinic Coin";

const CONSTANTS = {
    "CURRENCY": {
        "TAX_RATE": .15,
    },
    "INVENTORY": {
        "bamboozle": 1500
    },
    "PUNISH_COUNTS": {
        "bamboozle": 5
    },
    sanitizeAmount: function(amount) {
        if (amount > Number.MAX_SAFE_INTEGER) {
            return 0;
        }
        if ((amount % (!isNaN(parseFloat(amount))) >= 0) && 0 <= ~~amount) {
            return Math.round(amount * 100) / 100;
        }
        return 0;
    },    
    formatCurrency: function(amount) {
        return `${CURRENCY}${amount !== 1 ? "s" : ""}`;
    }
}

module.exports = CONSTANTS; 