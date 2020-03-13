const CURRENCY = "Cosinic Coin";

const CONSTANTS = {
    "CASINO": {
        "id": "CASINO",
        "name": "Casino Money Pool"
    },
    "CURRENCY": {
        "TAX_RATE": 0.15,
        "CASINO_TAX_RATE": 0.005,
        "DIVIDEND_RATE": 0.3, // 30% of bank wealth gets distributed equally to everyone
        "POVERTY_RATE": 0.15 // 15% of bank goes to the poverty before freedom dividends
    },
    "INVENTORY": {
        "bamboozle": 500000
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
