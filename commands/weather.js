require('dotenv').config();
const axios = require('axios');
const WEATHER_API = process.env.WEATHER_API;

const CURR_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
var WEATHER_COMMANDS = {
    today(args, received) {
        if (args.length > 0) {
            let location = args.join(' ');
            axios.get(`${CURR_WEATHER_URL}?q=${location}&units=imperial&appid=${WEATHER_API}`)
                .then((res) => {
                    let location = res.data.name;
                    let weather_id = res.data.weather[0].id;
                    let description = res.data.weather[0].description;
                    let temp = res.data.main.temp;
                    let min = res.data.main.temp_min;
                    let max = res.data.main.temp_max;
                    let wind = res.data.wind.speed;

                    // This just capitalizes the description
                    description = description.toLowerCase()
                        .split(' ')
                        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                        .join(' ');

                    let weatherInfo = `Current weather in ${location}: :${getWeatherEmoji(weather_id)}: ${description}\nTemperature: ${temp}°F (High ${max}°F/Min ${min}°F)\nWind Speeds: ${wind} mph`
                    received.channel.send(weatherInfo);
                }).catch(error => {
                    // console.log(error);
                    let error_description = error.response.data.message;
                    received.channel.send(`:cloud_tornado: Error ${error.response.status} ${error_description}`);
                });
        }
    }
}

// https://openweathermap.org/weather-conditions
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