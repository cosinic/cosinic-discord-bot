# Cosinic Discord Bot

## How to Use
1. Do `npm install` to install dependencies
2. Copy `.env.example` and rename to `.env` and fill in necessary fields to make bot run.
    - Mandatory fields are:
        - BOT_SECRET=DISCORD_SECRET_KEY
        - NODE_ENV=DEVELOPMENT
    - Other variables need to be filled in depending on which API you are testing.
3. Do `node app.js` to run the bot.

## To Do
#### Reddit Scheduler
- [x] ~~Function for instant posting request: `!reddit aww now top`~~ *(10/12/2019)*
- [ ] Function to display current schedule: `!reddit schedule`
- [ ] Function to delete specific time from schedule: `!reddit aww stop 15:00`
- [ ] Make 24 hour time request more user friendly
- [x] ~~Ignore videos or self posts and go to next post til it finds one~~ *(10/12/2019)*
- [x] ~~Ignore moderated posts or text posts~~ *(10/12/2019)*

#### Weather Checker
- [x] ~~Add forecast weather display~~ *(10/16/2019)*
- [x] ~~Add a scheduler that posts at a certain time of day~~ *(10/28/2019)*
- [x] ~~Allow multiple locations for scheduler~~ *(10/29/2019)*

#### Currency Games
- [ ] Roulette add Splits, Street, Corner, and Sixline