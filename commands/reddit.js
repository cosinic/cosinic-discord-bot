require('dotenv').config();
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
var cron = require('node-cron');
const snoowrap = require('snoowrap');

const r = new snoowrap({
    userAgent: 'User-Agent: ubuntu/linux:cosinic-dev-bot:v0.0.1',
    clientId: process.env.REDDIT_CLIENT,
    clientSecret: process.env.REDDIT_API,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});

/* JSON DB LAYOUT
channels: {
  id
  subreddits: {
    subreddit_name: {
        post_times: [],
        sort: top/hot/rising
    }
  }
}
*/
var redditDB = new JsonDB(new JsonDBConfig("reddit", true, false, '/'));

//!reddit [SUBREDDIT] [Time in HH:MM format 24 hour standard (multiple times separated by commas)] [top|hot|rising]
var REDDIT_COMMANDS = {
    handleSchedule(args, received) {
        if (received.channel.type !== "text") {
            received.channel.send(`You can only set this on a text channel`);
            return false;
        }
        if (args.length > 1) {
            let channel_id = received.channel.id;
            let subreddit = args[0];
            let times = args[1];
            let sort = "hot";
            if (args[2]) {
                sort = args[2];
            }
            if (times === "STOP" || times === "stop") {
                if (this.deleteSchedule(channel_id, subreddit)) {
                    received.channel.send(`Schedule deleted for /r/${subreddit}. Bot will stop posting daily from this subreddit.`);
                }
                return false;
            }
            if (times === "NOW" || times === "now") {
                sendPostToChannel(received.channel, subreddit, sort);
                return false;
            }
            if (!checkValidTimes(times)) {
                received.channel.send(`Error in time format. Please use 24 hour time. EG: 17:00 (for 5:00 PM) or 09:00 (for 9:00 AM)`);
                return false;
            }
            times = times.split(',');
            setSchedule(channel_id, subreddit, times, sort).then(data => {
                if (data)
                    received.channel.send(`Scheduled to post on this channel: **/r/${subreddit}** every day at ${data.times} sorting via ${sort}. Type \`!reddit ${subreddit} STOP\` to delete this schedule.`);
            });
        } else {
            received.channel.send("Error understanding !reddit format. Type `!help reddit` for how to use.");
        }
    },
    deleteSchedule(channel_id, subreddit) {
        try {
            redditDB.delete(`/channels/${channel_id}/subreddits/${subreddit}`);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

async function sendPostToChannel(channel, subreddit, sort) {
    let post = await fetchPicturePost(subreddit, sort);
    if (post) {
        let title = post.title;
        let author = post.author.name;
        let url = post.url;

        if ((url.match(/\.(jpeg|jpg|gif|png)$/) != null)) { //If it's an image, then download it and send the direct image
            channel.send(`Post from /r/${subreddit}. **${title}** by ${author}\nPermalink: <https://reddit.com${post.permalink}>`, {
                files: [url]
            });
        } else { // Otherwise, embed it into chat and let discord handle previews
            channel.send(`Post from /r/${subreddit}. **${title}** by ${author}\n${url}\nPermalink: <https://reddit.com${post.permalink}>`);
        }
    }
}

async function runSchedule(channel_id, subreddit) {
    let channel = client.channels.get(channel_id);
    let sub_schedule = redditDB.getData(`/channels/${channel_id}/subreddits/${subreddit}`);
    let sort = sub_schedule.sort;
    return await sendPostToChannel(channel, subreddit, sort);
}

async function setSchedule(channel_id, subreddit, times, sort) {
    let isValid = await checkValidSubreddit(subreddit);
    if (isValid) {
        redditDB.push('/channels/' + channel_id + '/subreddits/' + subreddit, {
            "post_times": times,
            "sort": sort
        }, false);
        let newData = redditDB.getData(`/channels/${channel_id}/subreddits/${subreddit}`);
        return {
            "times": newData.post_times.join(' & ')
        }
    } else {
        return false;
    }
}

async function getSubredditPost(subreddit, sort, link_id) {
    const sub_config = {
        limit: 1,
        time: 'day'
    };
    if (link_id) {
        sub_config['after'] = link_id; // Reddit API "after" checks posts after specified id
    }
    let sub = r.getSubreddit(subreddit);
    var submission;
    if (sort === "top") {
        submission = await sub.getTop(sub_config)
            .catch(err => {
                console.log(err);
                return false;
            });
    } else if (sort === "rising") {
        submission = await sub.getTop(sub_config)
            .catch(err => {
                console.log(err);
                return false;
            });
    } else { //default sort by hot
        submission = await sub.getHot(sub_config)
            .catch(err => {
                console.log(err);
                return false;
            });
    }
    return submission[0];
}

async function fetchPicturePost(subreddit, sort) {
    let post = await getSubredditPost(subreddit, sort);
    /**
     * post.distinguished = "moderator" - checks
     for mod posts
     * post.self_text  - checks
     for text posts and not image posts
     * post.url - checks that it has a link
     */
    function isValidPost(post) {
        return post && post.url && !post.distinguished && !post.self_text && !post.stickied && !post.pinned;
    }

    // Until a valid link/pic/gif has been found, keep searching while it iterates down using link_id
    while (!isValidPost(post)) {
        let link_id = post.name; // Name refers to ID of current post.
        post = await (getSubredditPost(subreddit, sort, link_id))
    }
    return post;
}

async function checkValidSubreddit(subreddit) {
    let response = await r.getSubreddit(subreddit).getNew({
        limit: 1
    }).catch(err => {
        return false;
    });
    if (response[0]) {
        return true;
    }
    return false;
}

function checkValidTimes(times) {
    if (times.length) {
        let arr = times.split(',');
        var regex = /[0-9][0-9]:[0-9][0-9]/g;
        return arr.map((time) => {
            let hours = time.split(':')[0];
            let minutes = time.split(':')[1];
            return time.match(regex) != null && hours < 24 && minutes < 60;
        }).every((x) => x === true);
    }
    return false;
}

function checkSchedule() {
    let currentTime = new Date();
    let currentHour = currentTime.getHours(),
        currentMinute = currentTime.getMinutes();
    let formatted = (currentHour < 10 ? "0" : "") + currentHour + ':' + (currentMinute < 10 ? "0" : "") + currentMinute;
    try {
        let channels = redditDB.getData('/channels');
        for (let id in channels) {
            let subreddits = channels[id]["subreddits"];
            for (let sub in subreddits) {
                let times = subreddits[sub]["post_times"];
                if (times.indexOf(formatted) > -1) {
                    runSchedule(id, sub);
                }
            }
        }

    } catch (error) {
        console.error(error);
    }
}

// Check every minute
cron.schedule('* * * * *', () => {
    checkSchedule();
}, {
    timezone: "America/New_York"
});

module.exports = REDDIT_COMMANDS;