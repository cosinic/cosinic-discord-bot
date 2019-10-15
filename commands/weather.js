require('dotenv').config();
const axios = require('axios');
const WEATHER_API = process.env.WEATHER_API;

const CURR_WEATHER_URL = 'api.openweathermap.org/data/2.5/weather';
var WEATHER_COMMANDS = {
    today(args, received) {
        if (args.length > 0) {
            let location = args.join(' ');
            axios.get(`${CURR_WEATHER_URL}?=${location}&units=imperial&appid=${WEATHER_API}`)
                .then((res) => {
                    let location = res.data.name;
                    let weather_id = res.data.weather[0].id;
                    let description = res.data.weather[0].description;
                    let temp = res.data.main.temp;
                    let min = res.data.main.temp_min;
                    let max = res.data.main.temp_max;
                    let wind = res.data.wind.speed;

                    let weatherInfo = `Current weather in ${location}: :${getWeatherEmoji(weather_id)}: ${description}\n Temperature: ${temp}°F (High ${max}°F/Min ${min}°F)\n Wind Speeds: ${wind} mph`
                    received.channel.send(weatherInfo);
                }).catch(error => {
                    console.log(error);
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
    let status_category = (id).toString()[0] + "00";
    emoji = WEATHER_CONDITIONS[status_category];
    return emoji || "sun_with_face";
}

module.exports = WEATHER_COMMANDS;