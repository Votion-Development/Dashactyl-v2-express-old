import fetch from "node-fetch";
import config from "@constants/config";
const { MongoClient } = require("mongodb");
const client = new MongoClient(config.db.connectionString, { useNewUrlParser: true, useUnifiedTopology: true });

export default async function handler(req, res) {
    if (req.query.error && req.query.error_description) {
        if (req.query.error === 'access_denied' && req.query.error_description === 'The resource owner or authorization server denied the request') return res.send("Cancelled Login Action")
    }

    if (!req.query.code) {
        return res.redirect("/?nocode")
    }

    const oauth2Token = await fetch(
        'https://discord.com/api/oauth2/token',
        {
            method: 'post',
            body: `client_id=${config.discord.id}&client_secret=${config.discord.secret}&grant_type=authorization_code&code=${encodeURIComponent(req.query.code)}&redirect_uri=${encodeURIComponent(config.discord.callbackpath)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
    )

    if (!oauth2Token.ok) return res.redirect("/?invalidcode")

    const tokenInfo = await oauth2Token.json()

    if (tokenInfo.scope !== 'guilds.join guilds email identify') return res.redirect("/?badscopes")

    const userInfo_raw = await fetch(
        'https://discord.com/api/users/@me',
        {
            method: 'get',
            headers: {
                Authorization: `Bearer ${tokenInfo.access_token}`
            }
        }
    )

    const userInfo = await userInfo_raw.json()

    console.log(userInfo)

    if (!userInfo.verified) return res.send("/?notverified")

    const guildInfo_raw = await fetch(
        'https://discord.com/api/users/@me/guilds',
        {
            method: 'get',
            headers: {
                Authorization: `Bearer ${tokenInfo.access_token}`
            }
        }
    )

    const guildInfo = await guildInfo_raw.json()

    if (!Array.isArray(userInfo.guilds)) return res.redirect("/?cannotgetguilds")

    const check_if_banned = (await fetch(
        `https://discord.com/api/guilds/${config.discord.guildID}/bans/${userInfo.id}`,
        {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${config.discord.token}`
            }
        }
    )).status

    return res.status(200).end();
}