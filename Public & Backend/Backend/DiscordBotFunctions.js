import {getSecret} from 'wix-secrets-backend';

const CHANNEL_NAME_TO_ID = {
    "shop": "926520859772981288",
    "promotions": "926524772538523668",
    "infinite-twitch-drops": "1102701313218846830",
    "mcc-twitch-drops": "1102701313218846830",
    "news": "926524570779926558",
    "weekly-reset": "929505647601537056",
    "test": "926520307014049792"
};

const CHANNEL_NAME_TO_NOTIF_ROLE = {
    "shop": "941847238085341245",
    "promotions": "941847068434112552",
    "infinite-twitch-drops": "1102702008898687016",
    "news": "941846560814293062",
    "weekly-reset": "941847552167399494",
    "test": "926516155626192988",
    "new-infinite-twitch-drops": "1116078304429088788",
    "mcc-twitch-drops": "1225291679779782686",
    "new-mcc-twitch-drops": "1225290999165616248"
};

const discord = require('@jsmrcaga/discord');

export async function sendDiscordMessage(channel, messageText, notify = false, newTwitchDrop=false) {
    // Executes `Identify` command on its own
    // Handles `Resume`, `Heartbeat` automatically
    let bot = new discord({
        identify: {
            token: await getSecret("DiscordBotToken")
        }
    });

    const CHANNEL_ID = CHANNEL_NAME_TO_ID[channel];

    await bot.message({
        channel: CHANNEL_ID,
        content: messageText + ((notify) ? ("\n<@&" + CHANNEL_NAME_TO_NOTIF_ROLE[channel] + ">") : "") + ((newTwitchDrop) ? ("\n<@&" + CHANNEL_NAME_TO_NOTIF_ROLE["new-" + channel] + ">") : "")
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

    const CHANNEL_ID = CHANNEL_NAME_TO_ID[channel];

    await bot.message({
        channel: CHANNEL_ID,
        content: "<@&" + CHANNEL_NAME_TO_NOTIF_ROLE[channel] + ">"
    }).then(({ status, headers, response }) => {
        console.log(status);
        console.log(headers);
        console.log(response);
    }).catch(e => {
        console.error(e);
    });
}
