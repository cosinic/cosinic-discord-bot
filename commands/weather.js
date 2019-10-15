require('dotenv').config();
const axios = require('axios');
const WEATHER_API = process.env.WEATHER_API;

const CURR_WEATHER_URL = 'api.openweathermap.org/data/2.5/weather';
var WEATHER_COMMANDS = {
    today(args, received) {
        if (args.length > 0) {
            axios.get(`${CURR_WEATHER_URL}?=${args[0]}&units=imperial&appid=${WEATHER_API}`)
                .then((res) => {
                    let location =  res.data.name;
                    let description = res.data.weather[0].description;
                    let temp = res.data.main.temp;
                    let min = res.data.main.temp_min;
                    let max = res.data.main.temp_max;
                    let wind = res.data.wind.speed;
                    
                    let weatherInfo = `Current weather in ${location}: ${description}\n Temperature: ${temp}°F (High ${max}°F/Min ${min}°F)\n Wind Speeds: ${wind} mph`
                    received.channel.send(weatherInfo);
                }).catch(error => {
                    console.log(error);
                });
        }
    }
}

module.exports = WEATHER_COMMANDS;