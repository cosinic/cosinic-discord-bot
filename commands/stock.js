require('dotenv').config();
const axios = require('axios');
const IEX_API = process.env.IEX_API;
const IEX_URL = `https://cloud.iexapis.com/stable/`;

var STOCK_COMMANDS = {
    handleCommand(args, received) {
        if (args.length) {
            if (args[0] === "help") {
                HELP_COMMANDS.help("stock", received);
                return;
            }
            this.getStock(args, received);
        }
    },
    getStock(args, received) {
        if (args.length) {
            const TICKER = args[0];
            if (args.length === 1) {
                const quoteURL = IEX_URL + `stock/${TICKER}/quote?token=${IEX_API}`;
                axios.get(quoteURL)
                    .then((res) => {
                        let stock = res.data;
                        let update_time = new Date(stock.latestUpdate);
                        update_time = update_time.toLocaleDateString() + ' ' + update_time.toLocaleTimeString();

                        let change_percent = stock.changePercent * 100;

                        const isMarketOpen = stock.isUSMarketOpen;

                        let stockInfo = `${stock.companyName} **(${stock.symbol})** ${isMarketOpen ? "is trading at" : "closed at"} **$${stock.latestPrice.toLocaleString('en')}** (${change_percent > 0 ? "+" : ""}${change_percent.toFixed(2)}%) \n`;
                        if (stock.open)
                            stockInfo += `It opened at $${stock.open.toLocaleString('en')}. \n`;
                        if (stock.close && !isMarketOpen)
                            stockInfo += `It closed at at $${stock.close.toLocaleString('en')}. \n`;
                        if (stock.low && stock.high)
                            stockInfo += `Today's low: $${stock.low.toLocaleString('en')}. Today's high: $${stock.high.toLocaleString('en')}. \n`;

                        if (!isMarketOpen && stock.extendedPrice) {
                            let after_hour_time = new Date(stock.extendedPriceTime);
                            let after_hour_change_percent = stock.extendedChangePercent * 100;
                            stockInfo += `After Hours Price: **$${stock.extendedPrice.toLocaleString('en')}** (${after_hour_change_percent > 0 ? "+" : ""}${after_hour_change_percent.toFixed(2)}%). \n`;
                            updated_time = after_hour_time.toLocaleDateString() + ' ' + after_hour_time.toLocaleTimeString();
                        }
                        
                        stockInfo += `*US Market is currently ${isMarketOpen ? "open" : "closed"}. Last updated ${update_time}.*`;

                        received.channel.send(stockInfo);
                    }).catch(error => {
                        if (error.response && error.response.status) {
                            if (error.response.status === 404) { // Ticker not found
                                let errorText = `The stock with ticker **${TICKER}** was not found.`
                                received.channel.send(errorText);
                            } else {
                                console.log(error);
                            }
                        } else {
                            console.log('Error fetching stock data');
                        }
                    });
            } else {
                let optional_args = args[1];
                if (typeof optional_args === "string") {
                    if (optional_args === "info") {
                        const companyURL = IEX_URL + `stock/${TICKER}/company?token=${IEX_API}`;
                        axios.get(companyURL)
                            .then((res) => {
                                let stock = res.data;
                                let stockInfo = `${stock.companyName} **(${stock.symbol})** is listed on the ${stock.exchange}. \n`;
                                stockInfo += `Current CEO is ${stock.CEO} and has ${stock.employees ? stock.employees.toLocaleString('en') : "unknown number of"} employees. \n`;
                                stockInfo += `They are in the ${stock.industry} industry within the ${stock.sector} sector. \n`;
                                stockInfo += `> ${stock.description} \n`;
                                stockInfo += `*<${stock.website}>*`;

                                received.channel.send(stockInfo);
                            }).catch(error => {
                                console.log(error);
                            });
                    }
                }
            }
        }
    },

    getStonk(args, received) {
        let image_stonk = 'https://cosinic.com/stonk.png',
            image_not_stonk = 'https://cosinic.com/notstonk.png';
        const TICKER = args[0];
        const quoteURL = IEX_URL + `stock/${TICKER}/quote?token=${IEX_API}`;
        axios.get(quoteURL)
            .then((res) => {
                let stock = res.data;
                let change_percent = stock.changePercent * 100;

                if (change_percent >= 0) {
                    received.channel.send('', {
                        files: [image_stonk]
                    });
                } else {
                    received.channel.send('', {
                        files: [image_not_stonk]
                    });
                }
            }).catch(error => {
                console.log(error);
            });
    }
}

module.exports = STOCK_COMMANDS;