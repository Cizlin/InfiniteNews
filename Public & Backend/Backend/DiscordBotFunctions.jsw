import {getSecret} from 'wix-secrets-backend';

const channelNameToId = {
    "shop": "926520859772981288",
    "promotions": "926524772538523668",
    "news": "926524570779926558",
    "weekly-reset": "929505647601537056",
    "test": "926520307014049792"
};

const channelNameToNotifRole = {
    "shop": "941847238085341245",
    "promotions": "941847068434112552",
    "news": "941846560814293062",
    "weekly-reset": "941847552167399494",
    "test": "926516155626192988"
};

const discord = require('@jsmrcaga/discord');

export async function sendDiscordMessage(channel, messageText, notify = false) {
    // Executes `Identify` command on its own
    // Handles `Resume`, `Heartbeat` automatically
    let bot = new discord({
        identify: {
            token: await getSecret("DiscordBotToken")
        }
    });

    const channel_id = channelNameToId[channel];

    await bot.message({
        channel: channel_id,
        content: messageText + ((notify) ? ("\n<@&" + channelNameToNotifRole[channel] + ">") : "")
    }).then(({ status, headers, response }) => {
        console.log(status);
        console.log(headers);
        console.log(response);
    }).catch(e => {
        console.error(e);
    });
}

export async function sendDiscordNotification(channel) {
    let bot = new discord({
        identify: {
            token: await getSecret("DiscordBotToken")
        }
    });

    const channel_id = channelNameToId[channel];

    await bot.message({
        channel: channel_id,
        content: "<@&" + channelNameToNotifRole[channel] + ">"
    }).then(({ status, headers, response }) => {
        console.log(status);
        console.log(headers);
        console.log(response);
    }).catch(e => {
        console.error(e);
    });
}