const { Router } = require("express");
const fetch = require("node-fetch");
const util = require("../util");
const db = require("../functions/db");

const router = Router();
const settings = util.loadSettings();

router.get("/login", (req, res) => {
  res.redirect(
    `https://discord.com/api/oauth2/authorize?client_id=${settings.discord.id}` +
      `&redirect_uri=${encodeURIComponent(settings.discord.callbackpath)}` +
      "&response_type=code&scope=identify%20email%20guilds%20guilds.join" +
      `${
        !settings.discord.prompt
          ? "&prompt=none"
          : req.query.prompt
          ? req.query.prompt === "none"
            ? "&prompt=none"
            : ""
          : ""
      }`
  );
});

router.get("/callback", async (req, res) => {
  if (req.query.error && req.query.error_description) {
    if (req.query.error === "access_denied")
      return res.send("Cancelled Login Action");
  }
  if (!req.query.code) return res.redirect("/?nocode");

  let data;
  data = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `client_id=${settings.discord.id}&client_secret=${settings.discord.secret}` +
      `&grant_type=authorization_code&code=${encodeURIComponent(
        req.query.code
      )}` +
      `&redirect_uri=${encodeURIComponent(settings.discord.callbackpath)}`,
  });
  if (!data.ok) return res.redirect("/?invalidcode");

  const token = await data.json();
  if (
    !["identify", "email", "guilds", "guilds.join"].every((s) =>
      token.scope.includes(s)
    )
  )
    return res.redirect("/?invalidscope");

  data = await fetch("https://discord.com/api/users/@me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!data.ok) return res.redirect("/?nouser");
  const user_info = await data.json();
  if (!user_info.verified) return res.redirect("/?notverified");

  if (settings.discord.guild_id?.length && settings.discord.token?.length) {
    data = await fetch(
      `https://discord.com/api/guilds/${settings.discord.guild_id}/bans/${user_info.id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token.access_token}` },
      }
    );

    if (data.status === 200) {
      // TODO: blacklist user
      return res.redirect("/?banned");
    } else if (data.status === 404) {
      data = await fetch(
        `https://discord.com/api/guilds/${settings.discord.guild_id}/members/${user_info.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${settings.discord.token}`,
          },
          body: JSON.stringify({
            access_token: token.access_token,
          }),
        }
      );
    } else {
      console.log(
        `[AUTO-JOIN] Received status code '${data.status}' for ban status.`
      );
    }
  }

  let db_info = await db.fetchAccount(user_info.id);
  db_info ??= await db.createAccount(user_info);
  let panel_info,
    gen_pass,
    id = db_info?.pterodactylID;

  if (!db_info) {
    panel_info = await db.createAccount(user_info);
    id = panel_info.id;
    if (panel_info.password) gen_pass = panel_info.password;

    db_info = {
      discordID: user_info.id,
      pterodactylID: panel_info.id,
      email: user_info.email,
      username: user_info.username,
      package: "default",
      coins: 0,
      memory: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
      dateAdded: Date.now(),
    };
  } else {
    data = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${id}?include=servers`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if (!data.ok) return res.redirect("/?cannotgetinfo");
    panel_info = (await data.json()).attributes;
  }

  const blacklisted = await db.checkBlacklisted(user_info.id);
  if (blacklisted && !panel_info.root_admin)
    return res.redirect("/?blacklisted");

  req.session.data = { user_info, db_info, panel_info };
  req.session.save();
  res.redirect("/dashboard");
});

module.exports = router;
