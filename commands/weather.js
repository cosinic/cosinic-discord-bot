require('dotenv').config();
const axios = require('axios');
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
const cron = require('node-cron');
const moment = require('moment-timezone');

const WEATHER_API = process.env.WEATHER_API;

/* Weather Forecast DB Layout
cities: {
  city_name+,+state_code+,+country_code: {
    updated_day
    forecast: {
        ...forecast
    }
  }  
}
*/
var forecastDB = new JsonDB(new JsonDBConfig("db/forecast", true, false, '/'));

/** Weather Schedule DB Layout
 * accounts {
 * * userid {
 * * * location: [locations]
 * * }
 * }
 * channels {
 * * channelid {
 * * * location
 * * }
 * }
 */
var scheduleDB = new JsonDB(new JsonDBConfig("db/weather_schedule", true, false, '/'));

/** Weather Defaults DB Layout
 * accounts {
 * * userid {
 * * * location
 * * * unit
 * * }
 * }
 */
var defaultDB = new JsonDB(new JsonDBConfig("db/weather_defaults", true, false, '/'));

const CURR_WEATHER_URL = 'https://api.weatherbit.io/v2.0/current';
const FORECAST_WEATHER_URL = 'https://api.weatherbit.io/v2.0/forecast/daily';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_UNIT = 'I';
const UNIT_WORD = {
    "I": "Imperial",
    "S": "Scientific",
    "M": "Metric"
}
var WEATHER_COMMANDS = {
    handleCommand(args, received) {
        if (args.length) {
            switch (args[0]) {
                case "help":
                    HELP_COMMANDS.help("weather", received);
                    break;
                case "week":
                    this.week(args.slice(1), received);
                    break;
                case "tomorrow":
                    this.tomorrow(args.slice(1), received);
                    break;
                case "schedule":
                    this.schedule(args.slice(1), received);
                    break;
                case "set":
                case "default":
                    this.setDefault(args.slice(1), received);
                    break;
                default:
                    this.today(args, received);
                    break;
            }
        } else { // User typed in !weather so see if they have default location
            this.displayDefault(received);
        }
    },
    today(args, received) {
        if (args.length > 0) {
            let unit = DEFAULT_UNIT;
            if (["M", "S", "I"].indexOf(args[0]) > -1) { //Then first args is units
                unit = args[0];
                args = args.slice(1);
            }
            let location = args.join(' ');
            if (!location) {
                received.channel.send(`No location specified. Will try to display default location.`);
                this.displayDefault(received);
                return;
            }
            fetchCurrentWeather(location, unit)
                .then((data) => {
                    let message = formatCurrentMessage(location, unit, data)
                    received.channel.send(message);
                }).catch(err => {
                    received.channel.send(`:cloud_tornado: Error ${err}`);
                })
        }
    },
    tomorrow(args, received) {
        if (args.length > 0) {
            let unit = DEFAULT_UNIT;
            if (["M", "S", "I"].indexOf(args[0]) > -1) { //Then first args is units
                unit = args[0];
                args = args.slice(1);
            }
            let location = args.join(' ');
            let today = new Date();
            let tomorrow = new Date(today.setDate(today.getDate() + 1));
            tomorrow = getFormattedDate(tomorrow);

            fetchWeeklyWeather(location, unit)
                .then((data) => {
                    let weather_data = data.forecast;
                    location = data.location || location;

                    let tomorrow_index = 1;
                    for (let i = 0; i < weather_data.length; i++) { // Goes through 7 day forecast to find the index of tomorrow's forecast
                        let date = weather_data[i].valid_date.replace(/-/g, '\/');
                        let datetime = new Date(date);
                        let dateFormatted = getFormattedDate(datetime);
                        if (dateFormatted === tomorrow) {
                            tomorrow_index = i;
                            tomorrow = dateFormatted;
                            break;
                        }
                    }

                    let tomorrow_data = weather_data[tomorrow_index];
                    let message = formatTomorrowMessage(location, unit, tomorrow_data);
                    received.channel.send(message);
                }).catch(err => {
                    received.channel.send(`:cloud_tornado: Error ${err}`);
                })
        }
    },
    week(args, received) {
        if (args.length > 0) {
            let unit = DEFAULT_UNIT;
            if (["M", "S", "I"].indexOf(args[0]) > -1) { //Then first args is units
                unit = args[0];
                args = args.slice(1);
            }
            let location = args.join(' ');
            fetchWeeklyWeather(location, unit)
                .then((data) => {
                    let weather_data = data.forecast;
                    location = data.location || location;
                    let equalsSignLength = 44; // 44 equals signs seems to be good on mobile (Tested on Pixel XL)
                    let header = `${'='.repeat(equalsSignLength)}\n${' '.repeat((equalsSignLength * 2 - 19 - location.length)/2)}7 Day Forecast for ${location}\n${'='.repeat(equalsSignLength)}`;
                    received.channel.send(header);

                    const delay = ms => {
                        return new Promise(resolve => setTimeout(resolve, ms))
                    }

                    const delayMessage = cb => {
                        return delay(300).then(() => {
                            cb();
                        });
                    }

                    // Discord rate limit = 5 messages every 5 seconds.
                    const displayLoop = async _ => {
                        let dayInfo = '';
                        for (let i = 0; i < 7; i++) {
                            let forecast_data = weather_data[i];
                            let message = formatForecastMessage(unit, forecast_data);
                            dayInfo += message;
                            if (i % 3 === 0 || i === 6) { // Posts every 3 messages to lessen discord rate limit
                                await delayMessage(() => {
                                    received.channel.send(dayInfo);
                                    dayInfo = '';
                                });
                            }

                        }
                    }

                    displayLoop();

                }).catch(err => {
                    received.channel.send(`:cloud_tornado: Error ${err}`);
                })
        }
    },
    schedule(args, received) {
        if (args.length) {
            let id = received.author.id; // Default set as author ID
            let isChannel = false;
            if (received.guild && received.channel.type === "text") { // If part of guild and typed in text channel
                id = received.channel.id; // Then set as channel id
                isChannel = true;
            }

            if (args[0] === "remove") {
                let location = args.slice(1).join(' ');
                if (removeSchedule(id, location, isChannel)) {
                    let current_locations = getSchedule(id, isChannel);
                    received.channel.send(':dizzy: Removed successfully.');
                    if (current_locations) {
                        if (typeof current_locations === "string") {
                            received.channel.send(`Current scheduled weather location is: ${current_locations}`);
                        } else {
                            received.channel.send(`Current scheduled weather locations are: ${current_locations.map(x => `**${x}**`).join(' & ')}`);
                        }
                    } else {
                        received.channel.send(`All locations removed. Weather forecast will stop posting here.`);
                    }
                } else {
                    let current_locations = getSchedule(id, isChannel);
                    if (current_locations) {
                        received.channel.send(`:cloud_tornado: Location was not found.`);
                        if (typeof current_locations === "string") {
                            received.channel.send(`Valid location is: ${current_locations}`);
                        } else {
                            received.channel.send(`Valid locations are: ${current_locations.map(x => `**${x}**`).join(' OR ')}`);
                        }
                    } else {
                        received.channel.send(`:cloud_tornado: There is no scheduled weather for this channel.`);
                    }
                }
                return;
            }

            if (args[0] === "stop") {
                deleteSchedule(id, isChannel);
                received.channel.send('Weather forecast will stop posting here.');
                return;
            }

            location = args.join(' ');
            if (setSchedule(id, location, isChannel)) {
                let locations = getSchedule(id, isChannel);
                if (locations) {
                    locations = (typeof locations === "string" ? [locations] : locations);
                    received.channel.send('Weather forecast is now scheduled to post here daily for: ' + locations.map(x => `**${x}**`).join(' & '));
                } else {
                    received.channel.send(':cloud_tornado: Something went wrong.');
                }
            } else {
                received.channel.send(':cloud_tornado: Something went wrong.');
            }
        }
    },
    setDefault(args, received) {
        if (args.length) {
            let unit = DEFAULT_UNIT;
            if (["M", "S", "I"].indexOf(args[0]) > -1) { //Then first args is units
                unit = args[0];
                args = args.slice(1);
            }
            let id = received.author.id;
            let location = args.join(' ');
            if (setDefaults(id, unit, location)) {
                received.channel.send(`<@${id}> your default weather location has been set to: **${location}**. Your default unit is: ${UNIT_WORD[unit]}`);
            } else {
                received.channel.send(':cloud_tornado: Something went wrong.');
            }
        } else {
            received.channel.send(':cloud_tornado: Invalid Format. You can type `!weather set (optional)[M|S|I] [LOCATION]` to set your default location and units.');
        }
    },
    displayDefault(received) {
        let id = received.author.id;
        let defaults = getDefaults(id);
        if (defaults) {
            let location = defaults.location;
            let unit = defaults.unit || DEFAULT_UNIT;
            this.today([unit, location], received);
        } else {
            received.channel.send(':cloud_tornado: No default has been set. You can type `!weather set [LOCATION]` to set your default location to use `!weather` without any parameters.');
        }
    }
}

function formatCurrentMessage(location, unit, data) {
    let weather_data = data;
    location = weather_data.city_name + ', ' + weather_data.state_code || location;
    let weather_id = weather_data.weather.code;
    let description = weather_data.weather.description;
    let overall_weather_id = weather_data.overall_code
    let overall_description = weather_data.overall_description;
    let temp = weather_data.temp;
    let feels_temp = weather_data.app_temp;
    let wind = weather_data.wind_spd;
    let humidity = weather_data.rh;
    if (unit === "M") {
        wind = wind * 3.6;
    }
    let wind_dir = weather_data.wind_cdir_full;
    let high = weather_data.high || "N/A";
    let low = weather_data.low || "N/A";

    let message = `Current weather in **${location}**: ${getWeatherEmoji(weather_id)} ${description}\n`;
    message += `Overall forecasted weather: ${getWeatherEmoji(overall_weather_id)} ${overall_description}\n`;
    message += `Temperature: **${temp}${getUnitDegrees(unit)}** (Feels like ${feels_temp}${getUnitDegrees(unit)})\n`;
    message += `Today's High ${high}${getUnitDegrees(unit)} / Low ${low}${getUnitDegrees(unit)}\n`;
    message += `Relative Humidity: ${humidity}%\n`;
    message += `Wind Speeds: ${wind}*${getUnitSpeed(unit)}* ${wind_dir}`;

    return message;
}

function formatTomorrowMessage(location, unit, data) {
    let weather_data = data;

    let date = weather_data.valid_date.replace(/-/g, '\/');
    let datetime = new Date(date);
    let dateFormatted = getFormattedDate(datetime);
    let dayOfWeek = DAYS[datetime.getDay()];

    let weather_id = weather_data.weather.code;
    let description = weather_data.weather.description;
    let temp = weather_data.temp;
    let wind = weather_data.wind_spd;
    if (unit === "M") {
        wind = wind * 3.6;
    }
    let wind_dir = weather_data.wind_cdir_full;
    let high = weather_data.high_temp || "N/A";
    let low = weather_data.low_temp || "N/A";
    let pop = weather_data.pop;
    let precip = weather_data.precip;
    let snow = weather_data.snow;

    let message = `Weather tomorrow in **${location}**:\n`;
    message += `${getWeatherEmoji(weather_id)} ${description} *(${dayOfWeek} ${dateFormatted})*\n`;
    message += `Temperature: **${temp}${getUnitDegrees(unit)}** (High ${high}${getUnitDegrees(unit)}/ Low ${low}${getUnitDegrees(unit)})\n`;
    message += `Wind Speeds: ${wind}*${getUnitSpeed(unit)}* ${wind_dir}`;
    if (precip > 0) {
        message += `\nAccumulated rain: ${precip}${getUnitAmount(unit)}. Chance of precipitation: ${pop}%`;
    }
    if (snow > 0) {
        message += `\nAccumulated snowfall: ${snow}${getUnitAmount(unit)}.`;
    }
    return message;
}

function formatForecastMessage(unit, data) {
    let weather_data = data;

    let date = weather_data.valid_date.replace(/-/g, '\/');
    let datetime = new Date(date);
    let dateFormatted = getFormattedDate(datetime);
    let dayOfWeek = DAYS[datetime.getDay()];

    let weather_id = weather_data.weather.code;
    let description = weather_data.weather.description;
    let temp = weather_data.temp;
    let wind = weather_data.wind_spd;
    if (unit === "M") {
        wind = wind * 3.6;
    }
    let wind_dir = weather_data.wind_cdir_full;
    let high = weather_data.high_temp || "N/A";
    let low = weather_data.low_temp || "N/A";
    let pop = weather_data.pop;
    let precip = weather_data.precip;
    let snow = weather_data.snow;

    let message = `\n-----------------\n`;
    message += `**${dateFormatted}** (${dayOfWeek}):\n`;
    message += `${getWeatherEmoji(weather_id)} ${description}\n`;
    message += `**${temp}${getUnitDegrees(unit)}** (High ${high}${getUnitDegrees(unit)}/ Low ${low}${getUnitDegrees(unit)})\n`;
    message += `Wind Speeds: ${wind}*${getUnitSpeed(unit)}* ${wind_dir}`;
    if (precip > 0) {
        message += `\nAccumulated rain: ${precip}${getUnitAmount(unit)}. Chance of precipitation: ${pop}%`;
    }
    if (snow > 0) {
        message += `\nAccumulated snowfall: ${snow}${getUnitAmount(unit)}.`;
    }
    return message;
}

/**
 * 
 * Get current weather conditions
 * Also fetches forecast since forecast holds high/low temps
 * 
 */
async function fetchCurrentWeather(location, unit) {
    if (!location) return;
    unit = unit || DEFAULT_UNIT;
    let today = await axios.get(`${CURR_WEATHER_URL}?key=${WEATHER_API}&units=${unit}&city=${location}`);
    if (today.data.count) {
        let weather = today.data.data[0];
        let forecast = await getForecastWeather(weather, unit);
        if (forecast.forecast) {
            weather["high"] = forecast.forecast[0].high_temp; //First data in forecast is current day
            weather["low"] = forecast.forecast[0].low_temp;
            weather["overall_code"] = forecast.forecast[0].weather.code;
            weather["overall_description"] = forecast.forecast[0].weather.description;
        }
        return weather;
    } else {
        return Promise.reject('404 - Location not found');
    }
}

/**
 * 
 * Get 7 day weather forecast
 * 
 */
async function fetchWeeklyWeather(location, unit) {
    if (!location) return;
    unit = unit || DEFAULT_UNIT;
    let weather = {
        city_name: location,
        state_code: "",
        county_code: "US"
    }
    let forecast = await getForecastWeather(weather, unit);
    if (forecast.forecast) {
        return forecast;
    } else {
        return Promise.reject('404 - Location not found');
    }
}

/**
 * 
 * Gets the 16 day forecast from Weatherbit API
 * We don't want to call forecast on the same day, so we check if we already cached it
 * 
 */
async function getForecastWeather(location_data, unit) {
    if (!location_data) return;
    unit = unit || DEFAULT_UNIT;
    let city = location_data.city_name;
    let state = location_data.state_code;
    let country = location_data.country_code;
    try {
        let forecast = forecastDB.getData(`/cities/${city},${state},${country}`);
        if (forecast.updated_day) {
            let date = getDateToday();
            if (date === forecast.updated_day && forecast.units === unit) {
                return forecast;
            }
        }
    } catch (err) {
        // Then file was not found
    }

    let forecast = await fetchForecast(`${city},${state}`, unit);
    if (forecast.forecast) {
        return forecast;
    }
}

/**
 * 
 * Get the forecast and cache it into database for the day
 * 
 */
async function fetchForecast(location, unit) {
    if (!location) return;
    unit = unit || DEFAULT_UNIT;
    let forecast = await axios.get(`${FORECAST_WEATHER_URL}?key=${WEATHER_API}&units=${unit}&city=${location}&days=8`);
    if (forecast.data.city_name) {
        let city = forecast.data.city_name;
        let state = forecast.data.state_code;
        let country = forecast.data.country_code;
        let date = getDateToday();
        let forecast_data = forecast.data.data;
        let new_forecast = {
            "location": `${city}, ${state}`,
            "updated_day": date,
            "units": unit,
            "forecast": [
                ...forecast_data
            ]
        }
        forecastDB.push(`/cities/${city},${state},${country}`, new_forecast);
        return new_forecast;
    } else {
        return Promise.reject('404 - Location not found');
    }
}

// Return's todays date in M/D/YYYY format
function getDateToday() {
    let date = new Date();
    date = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
    return date;
}

function getUnitDegrees(unit) {
    let degree = '°F'; //Imperial 'MERICA
    switch (unit) {
        case 'M':
            degree = '°C';
            break;
        case 'S':
            degree = '°K';
            break;
        default:
            break;
    }
    return degree;
}

function getUnitSpeed(unit) {
    let speed = 'mph'; //Imperial
    switch (unit) {
        case 'M':
            speed = 'km/h';
            break;
        case 'S':
            speed = 'm/s';
            break;
        default:
            break;
    }
    return speed;
}

function getUnitAmount(unit) {
    let amount = 'in'; //Imperial
    switch (unit) {
        case 'M':
        case 'S':
            amount = 'mm';
            break;
        default:
            break;
    }
    return amount;
}

// Formats to MM/DD/YYYY
function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');

    return month + '/' + day + '/' + year;
}

// https://www.weatherbit.io/api/codes
// Discord Emoji codes
const WEATHER_CONDITIONS = {
    "200": ":thunder_cloud_rain:", //Thunderstorm
    "210": ":cloud_lightning:",
    "211": ":cloud_lightning:",
    "212": ":cloud_lightning:",
    "300": ":white_sun_rain_cloud:", //Drizzle
    "500": ":cloud_rain:", //Rain
    "502": ":sweat_drops::cloud_rain::sweat_drops:", //Heavy Rain
    "521": ":white_sun_rain_cloud:", //Shower Rain
    "600": ":snowflake:", //Light Snow
    "601": ":cloud_snow:", //Snow
    "602": ":cloud_snow::snowman2:", //Heavy Snow
    "700": ":fog:", //Mist
    "800": ":sunny:", //Clear
    "801": ":white_sun_small_cloud:", //Clouds
    "802": ":partly_sunny:",
    "803": ":white_sun_cloud:",
    "804": ":cloud:",
    "900": ":cloud_rain:"
}

getWeatherEmoji = (id) => {
    let emoji = WEATHER_CONDITIONS[id];
    if (emoji) {
        return emoji;
    }
    let status_category = (id).toString()[0] + "00"; // If not found then just use base X00 as emoji
    emoji = WEATHER_CONDITIONS[status_category];
    return emoji || ":sun_with_face:"; // Or just return a sun if not found at all
}

function getDefaults(userid) {
    try {
        let user_defaults = defaultDB.getData(`/accounts/${userid}`)
        return user_defaults;
    } catch (err) {
        // No default is set.
        return false;
    }
}

function setDefaults(userid, unit, location) {
    try {
        defaultDB.push(`/accounts/${userid}`, {
            "location": location,
            "unit": unit
        });
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function getSchedule(id, isChannel = false) {
    try {
        let path = isChannel ? 'channels' : 'accounts';
        let schedule = scheduleDB.getData(`/${path}/${id}/location`);
        if (schedule && (schedule.length || schedule[0]))
            return schedule;
        return false;
    } catch (err) {
        //No schedule
        return false;
    }
}

function setSchedule(id, location, isChannel = false) {
    try {
        let path = isChannel ? 'channels' : 'accounts';
        let userSched = getSchedule(id, isChannel);
        let currentLocations = [];
        if (userSched) {
            if (typeof userSched === "string") {
                currentLocations = [userSched];
            } else {
                currentLocations = userSched;
            }
        }
        scheduleDB.push(`/${path}/${id}`, {
            "location": Array.from(new Set([...currentLocations, location]))
        });
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

function removeSchedule(id, location, isChannel = false) {
    try {
        let locations = getSchedule(id, isChannel);
        let path = isChannel ? 'channels' : 'accounts';
        if (locations) {
            if (typeof locations === "string") { // Then there's only one thing to remove and so just delete the whole thing.
                deleteSchedule(id, isChannel);
                return true;
            } else {
                if (locations.length === 1) { // Then there's only one thing to remove and so just delete the whole thing.
                    deleteSchedule(id, isChannel);
                    return true;
                }
                let toRemoveIdx = locations.indexOf(location);
                if (toRemoveIdx > -1) {
                    locations.splice(toRemoveIdx, 1);
                    scheduleDB.push(`/${path}/${id}`, {
                        "location": locations
                    });
                    return true;
                } else {
                    return false; // Location not found in array
                }
            }
        }
        return false; // No schedule
    } catch (err) {
        return false; // Can't find location
    }
}

function deleteSchedule(id, isChannel = false) {
    try {
        let path = isChannel ? 'channels' : 'accounts';
        scheduleDB.delete(`/${path}/${id}`);
        return true;
    } catch (err) {
        return false;
    }
}

function runWeatherSchedule() {
    let currentTime = new Date();
    let currentHour = currentTime.getHours();
    let unit = DEFAULT_UNIT;

    let tomorrow = new Date(currentTime.setDate(currentTime.getDate() + 1));
    tomorrow = getFormattedDate(tomorrow);

    let weatherman_text = `${"=".repeat(13)} :sun_with_face: Weather Forecast :umbrella2: ${"=".repeat(13)}`;

    try {
        let accounts = scheduleDB.getData('/accounts');
        if (Object.keys(accounts).length) {
            for (var userid in accounts) {
                let user_locations = accounts[userid].location;
                if (!user_locations.length) {
                    break;
                }
                if (typeof user_locations === "string") {
                    user_locations = [user_locations];
                }

                let user_unit = unit;

                let user_defaults = getDefaults(userid);
                if (user_defaults) { // If a user has defaults, then display weather in their default unit.
                    user_unit = user_defaults.unit;
                }

                let user_to_send = client.users.get(userid);
                (async () => {
                    let weather_message = weatherman_text + '\n';
                    for (let [i, location] of user_locations.entries()) {
                        if (currentHour < 12) { // Then return today weather broadcast
                            await fetchCurrentWeather(location, user_unit)
                                .then((data) => {
                                    weather_message += formatCurrentMessage(location, user_unit, data);
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                }).catch(err => {
                                    weather_message += err;
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                });
                        } else { // Then return next day
                            await fetchWeeklyWeather(location, user_unit)
                                .then((data) => {
                                    let weather_data = data.forecast;
                                    location = data.location || location;

                                    let tomorrow_index = 1;
                                    for (let i = 0; i < weather_data.length; i++) { // Goes through 7 day forecast to find the index of tomorrow's forecast
                                        let date = weather_data[i].valid_date.replace(/-/g, '\/');
                                        let datetime = new Date(date);
                                        let dateFormatted = getFormattedDate(datetime);
                                        if (dateFormatted === tomorrow) {
                                            tomorrow_index = i;
                                            tomorrow = dateFormatted;
                                            break;
                                        }
                                    }
                                    let tomorrow_data = weather_data[tomorrow_index];
                                    weather_message += formatTomorrowMessage(location, user_unit, tomorrow_data);
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                }).catch(err => {
                                    weather_message += err;
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                });
                        }
                        if (i % 3 === 0 || i === user_locations.length - 1) { // Posts every 3 messages to lessen discord rate limit
                            user_to_send.send(weather_message);
                            weather_message = '';
                        }
                    }
                })();
            }
        }

    } catch (error) {
        console.error(error);
    }

    try {
        let channels = scheduleDB.getData('/channels');
        if (Object.keys(channels).length) {
            for (var channelid in channels) {
                let channel_locations = channels[channelid].location;
                if (!channel_locations.length) {
                    break;
                }
                if (typeof channel_locations === "string") {
                    channel_locations = [channel_locations];
                }

                let channel_to_send = client.channels.get(channelid);
                (async () => {
                    let weather_message = weatherman_text + '\n';
                    for (let [i, location] of channel_locations.entries()) {
                        if (currentHour < 12) { // Then return today weather broadcast
                            await fetchCurrentWeather(location, unit)
                                .then((data) => {
                                    weather_message += formatCurrentMessage(location, unit, data);
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                }).catch(err => {
                                    weather_message += err;
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                });
                        } else { // Then return next day
                            await fetchWeeklyWeather(location, unit)
                                .then((data) => {
                                    let weather_data = data.forecast;
                                    location = data.location || location;

                                    let tomorrow_index = 1;
                                    for (let i = 0; i < weather_data.length; i++) { // Goes through 7 day forecast to find the index of tomorrow's forecast
                                        let date = weather_data[i].valid_date.replace(/-/g, '\/');
                                        let datetime = new Date(date);
                                        let dateFormatted = getFormattedDate(datetime);
                                        if (dateFormatted === tomorrow) {
                                            tomorrow_index = i;
                                            tomorrow = dateFormatted;
                                            break;
                                        }
                                    }
                                    let tomorrow_data = weather_data[tomorrow_index];
                                    weather_message += formatTomorrowMessage(location, unit, tomorrow_data);
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                }).catch(err => {
                                    weather_message += err;
                                    weather_message += `\n${"=".repeat(44)}\n`;
                                });
                        }
                        if (i % 3 === 0 || i === channel_locations.length - 1) { // Posts every 3 messages to lessen discord rate limit
                            channel_to_send.send(weather_message);
                            weather_message = '';
                        }
                    }
                })();
            }
        }

    } catch (error) {
        console.error(error);
    }
}

function createWeatherScheduleTask(schedule, timezone = 'America/New_York') {
    return cron.schedule(schedule, runWeatherSchedule, {
        scheduled: false,
        timezone: timezone
    });
}

function getCorrectDst(timezone = 'America/New_York') {
    return moment.tz(timezone).isDST() ? dst_schedule : nondst_schedule;
}

function swapDstTasksIfNeeded() {
    const dst_now = getCorrectDst();
    if (current_dst !== dst_now) {
        current_dst = dst_now;
        current_task.destroy();
        console.log("Adjusting to new daylight savings.");
        current_task = createWeatherScheduleTask(dst_now);
    }
}

//Daylight Savings: at 7 AM (6) and 11 PM (22) => 0 6,22 * * *
//Daylight Savings End: 0 7,23 * * *
const nondst_schedule = '0 6,22 * * *';
const dst_schedule = '0 7,23 * * *';
let current_dst = getCorrectDst();
let current_task = createWeatherScheduleTask(current_dst);

// Run this every minute. It will account for it incase server time doesn't hit at 59 min for some reason.
cron.schedule('* * * * *', swapDstTasksIfNeeded);

module.exports = WEATHER_COMMANDS;