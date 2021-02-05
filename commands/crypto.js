require('dotenv').config();
const axios = require('axios');
/**
 * https: //nomics.com/docs/#operation/getCurrenciesTicker
 */
const NOMICS_API = process.env.NOMICS_API;
const NOMICS_ENDPOINT = `https://api.nomics.com/v1/`;

var CRYPTO_COMMANDS = {
    handleCommand(args, received) {
        if (args.length) {
            if (args[0] === "help") {
                HELP_COMMANDS.help("crypto", received);
                return;
            }
            this.getCurrency(args, received);
        }
    },
    getCurrency(args, received) {
        if (args.length) {
            const SYMBOL = (args[0]).toUpperCase();
            if (args.length === 1) {
                const quoteURL = NOMICS_ENDPOINT + `currencies/ticker?ids=${SYMBOL}&interval=1d&key=${NOMICS_API}`;
                axios.get(quoteURL)
                    .then((res) => {
                        const crypto = res.data[0];
                        const update_date = new Date(crypto.price_date);
                        const update_time = new Date(crypto.price_timestamp);

                        let formatted_update_time = update_date.toLocaleDateString() + ' ' + update_time.toLocaleTimeString();

                        const change_percent = crypto['1d'] ? parseFloat(crypto['1d'].price_change_pct) * 100 : 0;
                        const change_price = crypto['1d'] ? parseFloat(crypto['1d'].price_change) : 0;

                        const formatted_change_price = change_price > 1 ? change_price.toLocaleString('en') : change_price;

                        const latest_price = parseFloat(crypto.price);
                        const formatted_price = latest_price > 1 ? latest_price.toLocaleString('en') : latest_price;

                        let cryptoInfo = `__**${crypto.name} (${crypto.symbol})**__\n`;
                        cryptoInfo += `**$${formatted_price}**  *${change_price > 0 ? "+" : ""}$${formatted_change_price} (${change_percent > 0 ? "+" : ""}${change_percent.toFixed(2)}%)* \n`;
                        cryptoInfo += `*Last updated ${formatted_update_time}.*`;

                        received.channel.send(cryptoInfo);
                    }).catch(error => {
                        if (error.response && error.response.status) {
                            if (error.response.status === 404) { // Symbol not found
                                let errorText = `The crypto currency with symbol **${SYMBOL}** was not found.`
                                received.channel.send(errorText);
                            } else {
                                console.log(error);
                            }
                        } else {
                            console.error(error);
                            // console.log('Error fetching crypto data');
                        }
                    });
            } else {
                let optional_args = args[1];
                if (typeof optional_args === "string") {
                    if (optional_args === "info") {
                        const cryptoInfoURL = NOMICS_ENDPOINT + `currencies?ids=${SYMBOL}&attributes=id,original_symbol,name,description,website_url,reddit_url,whitepaper_url&key=${NOMICS_API}`;
                        axios.get(cryptoInfoURL)
                            .then((res) => {
                                const info = res.data[0];
                                let longDescription = false;
                                let cryptoInfo = `${info.name} **(${info.original_symbol})** information: \n`;
                                if (info.description.length > 1500) {
                                    longDescription = true;
                                } else {
                                    cryptoInfo += `>>> ${info.description} \n`;
                                }
                                if (info.website_url)
                                    cryptoInfo += `Website: <${info.website_url}> \n`;
                                if (info.reddit_url)
                                    cryptoInfo += `Reddit: <${info.reddit_url}> \n`;
                                if (info.whitepaper_url)
                                    cryptoInfo += `Whitepaper: <${info.whitepaper_url}>`;

                                received.channel.send(cryptoInfo);
                                if (longDescription) {
                                    let description = info.description;
                                    const descriptionArr = [];
                                    const delim = 1500;
                                    do {
                                        descriptionArr.push(description.substring(0, delim));
                                    }
                                    while ((description = description.substring(delim, description.length)) != "");
                                    
                                    (async function (arr) {
                                        for (const txt of arr) {
                                            await received.channel.send(`>>> ${txt}`);
                                        }
                                    })(descriptionArr);

                                }
                            }).catch(error => {
                                console.log(error);
                            });
                    }
                }
            }
        }
    },
}

module.exports = CRYPTO_COMMANDS;