const express = require('express');
const fetch = require("node-fetch");
const router = express.Router();
const yaml = require('js-yaml');
const fs = require('fs');

const db = require("../functions/db.js");
const settings = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8'));

router.get("/login", async (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${settings.discord.id}&redirect_uri=${encodeURIComponent(settings.discord.callbackpath)}&response_type=code&scope=identify%20email%20guilds%20guilds.join${!settings.discord.prompt ? '&prompt=none' : (req.query.prompt ? (req.query.prompt = 'none' ? '&prompt=none' : '') : '')}`)
})

router.get("/callback", async (req, res) => {
    if (req.query.error && req.query.error_description) {
        if (req.query.error === 'access_denied' && req.query.error_description === 'The resource owner or authorization server denied the request') return res.send("Cancelled Login Action")
    }

    if (!req.query.code) {
        return res.redirect("/?nocode")
    }

    const oauth2Token = await fetch(
        'https://discord.com/api/oauth2/token', {
            method: 'post',
            body: `client_id=${settings.discord.id}&client_secret=${settings.discord.secret}&grant_type=authorization_code&code=${encodeURIComponent(req.query.code)}&redirect_uri=${encodeURIComponent(settings.discord.callbackpath)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    )

    if (!oauth2Token.ok) return res.redirect("/?invalidcode");
    const tokenInfo = await oauth2Token.json()
    if (tokenInfo.scope !== 'identify email guilds guilds.join') return res.redirect("/?badscopes")

    const user_info_raw = await fetch(
        'https://discord.com/api/users/@me', {
            method: 'get',
            headers: {
                Authorization: `Bearer ${tokenInfo.access_token}`
            }
        }
    )

    // TODO: add status check before this
    const user_info = await user_info_raw.json()

    if (!user_info.verified) return res.send("/?notverified")

    const guildInfo_raw = await fetch(
        'https://discord.com/api/users/@me/guilds', {
            method: 'get',
            headers: {
                Authorization: `Bearer ${tokenInfo.access_token}`
            }
        }
    )

    const guildInfo = await guildInfo_raw.json()

    if (!Array.isArray(guildInfo)) return res.redirect("/?cannotgetguilds")


    const check_if_banned = (await fetch(
        `https://discord.com/api/guilds/${settings.discord.guildID}/bans/${user_info.id}`, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${settings.discord.token}`
            }
        }
    )).status

    if (check_if_banned === 200) {
        await db.toggleBlacklist(user_info.id, true)
    } else if (check_if_banned === 404) {
        await fetch(
            `https://discord.com/api/guilds/${settings.discord.guild}/members/${user_info.id}`, {
                method: 'put',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bot ${settings.discord.token}`
                },
                body: JSON.stringify({
                    access_token: tokenInfo.access_token
                })
            }
        )
    } else {
        console.log('[AUTO JOIN SERVER] For some reason, the status code is ' + check_if_banned + ', instead of 200 or 404. You should worry about this.')
    }

    let db_info = await db.fetchAccount(user_info.id);
    let panel_id, panel_info;
    let generated_password = `Not Set`

    if (!db_info) {
        panel_info = await db.createAccount(user_info.id, user_info.email, user_info.username, user_info.discriminator);
        panel_id = panel_info.id;

        if (panel_info.password) generated_password = panel_info.password;

        db_info = {
            discordID: user_info.id,
            pterodactylID: panel_info.id,
            email: user_info.email,
            username: user_info.username,
            coins: 0,
            package: `Not Set`,
            memory: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
            dateadded: Date(),
        }
    } else {
        panel_id = db_info.pterodactylID

        const panelInfo_raw = await fetch(
            `${settings.pterodactyl.domain}/api/application/users/${panel_id}?include=servers`, {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${settings.pterodactyl.key}`
                }
            }
        )

        if (await panelInfo_raw.statusText === 'Not Found') return res.redirect("/?cannotgetinfo")
        panel_info = (await panelInfo_raw.json()).attributes
    }

    const blacklist_status = await db.blacklistStatus(user_info.id);
    if (blacklist_status === true && !panel_info.root_admin) return res.redirect("/blacklisted");

    req.session.data = { db_info, user_info, panel_info };

    if (generated_password) {
        req.session.variables = {
            password: generated_password
        }
    }

    req.session.save();

    res.redirect("/dashboard")
})

module.exports = router;
