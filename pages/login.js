import config from "@constants/config";

export default function handler(req, res) {
    res.redirect(config.discordUrl)
}