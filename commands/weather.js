require('dotenv').config();
const axios = require('axios');
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
var cron = require('node-cron');

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

const CURR_WEATHER_URL = 'https://api.weatherbit.io/v2.0/current';
const FORECAST_WEATHER_URL = 'https://api.weatherbit.io/v2.0/forecast/daily';
const UNITS = 'I'; //M (Metric) | S (Scientific) | I (Imperial)
var WEATHER_COMMANDS = {
    today(args, received) {
        if (args.length > 0) {
            let location = args.join(' ');
            fetchCurrentWeather(location)
                .then((weather_data) => {
                    if (!weather_data) {
                        received.channel.send(`:cloud_tornado: Error - Location not found`);
                        return;
                    }
                    let location = weather_data.city_name;
                    let weather_id = weather_data.weather.code;
                    let description = weather_data.weather.description;
                    let temp = weather_data.temp;
                    let feels_temp = weather_data.app_temp;
                    let wind = weather_data.wind_spd;
                    let wind_dir = weather_data.wind_cdir_full;
                    let high = weather_data.high || "N/A";
                    let low = weather_data.low || "N/A";

                    let weatherInfo = `Current weather in ${location}: :${getWeatherEmoji(weather_id)}: ${description}\nTemperature: **${temp}°F** (Feels like ${feels_temp}°F)\nToday's High ${high}°F / Low ${low}°F\nWind Speeds: ${wind} mph ${wind_dir}`;
                    received.channel.send(weatherInfo);
                });
        }
    }
}

/**
 * 
 * Get current weather conditions
 * Also fetches forecast since forecast holds high/low temps
 * 
 */
async function fetchCurrentWeather(location) {
    if (!location) return;
    try {
        let today = await axios.get(`${CURR_WEATHER_URL}?key=${WEATHER_API}&units=${UNITS}&city=${location}`);
        if (today.data.count) {
            let weather = today.data.data[0];
            let forecast = await getForecastWeather(weather);
            if (forecast) {
                weather["high"] = forecast[0].high_temp; //First data in forecast is current day
                weather["low"] = forecast[0].low_temp;
            }
            return weather;
        } else {
            throw new Error("404 - Weather location not found");
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * 
 * Gets the 16 day forecast from Weatherbit API
 * We don't want to call forecast on the same day, so we check if we already cached it
 * 
 */
async function getForecastWeather(location_data) {
    if (!location_data) return;
    let city = location_data.city_name;
    let state = location_data.state_code;
    let country = location_data.country_code;
    try {
        let forecast = forecastDB.getData(`/cities/${city},${state},${country}`);
        if (forecast.updated_day) {
            let date = getDateToday();
            if (date === forecast.updated_day) {
                return forecast.forecast;
            }
        }
    } catch (err) {
        // Then file was not found
    }

    let forecast = await fetchForecast(`${city},${state}`);
    if (forecast.length) {
        return forecast;
    }
}

/**
 * 
 * Get the forecast and cache it into database for the day
 * 
 */
async function fetchForecast(location) {
    if (!location) return;
    try {
        let forecast = await axios.get(`${FORECAST_WEATHER_URL}?key=${WEATHER_API}&units=${UNITS}&city=${location}`);
        if (forecast.data.city_name) {
            let city = forecast.data.city_name;
            let state = forecast.data.state_code;
            let country = forecast.data.country_code;
            let date = getDateToday();
            let forecast_data = forecast.data.data;
            forecastDB.push(`/cities/${city},${state},${country}`, {
                "updated_day": date,
                "forecast": [
                    ...forecast_data
                ]
            });
            return forecast_data;
        } else {
            throw new Error("404 - Weather location not found");
        }
    } catch (err) {
        console.error(err);
    }
}

// Return's todays date in M/D/YYYY format
function getDateToday() {
    let date = new Date();
    date = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
    return date;
}

// https://www.weatherbit.io/api/codes
// Discord Emoji codes
const WEATHER_CONDITIONS = {
    "200": "thunder_cloud_rain", //Thunderstorm
    "210": "cloud_lightning",
    "211": "cloud_lightning",
    "212": "cloud_lightning",
    "300": "cloud_rain", //Drizzle
    "500": "white_sun_rain_cloud", //Rain
    "600": "snowflake", //Snow
    "601": "cloud_snow",
    "602": "cloud_snow",
    "700": "fog", //Mist
    "800": "sunny", //Clear
    "801": "white_sun_small_cloud", //Clouds
    "802": "partly_sunny",
    "803": "white_sun_cloud",
    "804": "cloud",
    "900": "cloud_rain"
}

getWeatherEmoji = (id) => {
    let emoji = WEATHER_CONDITIONS[id];
    if (emoji) {
        return emoji;
    }
    let status_category = (id).toString()[0] + "00"; // If not found then just use base X00 as emoji
    emoji = WEATHER_CONDITIONS[status_category];
    return emoji || "sun_with_face"; // Or just return a sun if not found at all
}

module.exports = WEATHER_COMMANDS;