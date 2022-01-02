const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const fs = require('fs');
const ejs = require('ejs')
const getUserResources = require("./getUserResources.js")

let theme = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8')).website.theme;
let pagesFile = yaml.load(fs.readFileSync(`./src/themes/${theme}/pages.yml`, 'utf8'));

const settings = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8'))

let file;
let type;

router.get("*", async (req, res) => {
    if (req._parsedUrl.pathname === "/") {
        file = pagesFile.pages.login.file
    } else {
        let pathname = req._parsedUrl.pathname.slice(1)

        if (pathname.slice(-1) === '/') pathname = pathname.slice(0, -1)

        const exists = pagesFile.pages[pathname];

        if (typeof exists === "undefined") {
            res.status(404)
            file = pagesFile.pages.error404.file
        } else {
            const permission = exists.permission

            if (!exists.type) return res.send("There is an error with the pages.yml file and the route you specified has no file type attached to it. Please contact an administrator to get this sorted.")

            type = exists.type

            if (permission === 0 || permission === 1 || permission === 2) { // Checks if it is a valid permission number.
                /*
                0 = Anyone can view the page.
                1 = Only users logged in can view the page. 403 if not logged in.
                2 = Only administrators can view the page. 404 if not an administrator.
                */
                if (permission === 1 || permission === 2) {
                    console.log(req.session)
                    console.log(req.session.data)
                    if (!req.session.data || !req.session.data.userInfo) {
                        res.status(403)
                        file = pagesFile.pages.error403.file // The value of "nopermission" on pages.yml is the page to be shown.
                        console.log(file)
                    } else {
                        if (permission === 1) {
                            file = exists.file
                        } else if (permission === 2) { // Check if the route is administrator only.
                            if (!req.session.data.panelInfo.root_admin) { // If user isn't an administrator.
                                res.status(404)
                                file = pagesFile.pages.error403.file
                            } else { // If user is an administrator.
                                file = exists.file
                            };
                        };
                    }
                } else { // Pages anyone can go to. (no login required)
                    file = exists.file
                };
            } else { // Permissions value on pages.yml for the path is not 0, 1, or 2.
                console.log(`[WEBSITE] On the path "${pathname}", the permission value is invalid. The value must be 0 (everyone), 1 (logged in), or 2 (administrator).`)
                return res.send('An error has occured while attempting to load this page. Please contact an administrator to fix this.')
            };
        }
    }

    let packageinfo = `Not Set`
    let extra = 0
    let total = 0
    let current = 0
    let server_timers = 0

    const resources = await getUserResources(req) // I can't use "let {packageinfo, extra, total, current}".

    if (resources === `noPackage`) {
        res.status(500)
        let serverInvite

        if (!settings.discord.invite) {
            serverInvite = `notSet`
        } else {
            serverInvite = settings.discord.invite
        }

        return res.render(pagesFile.pages.error500.file, { error: "Your package assigned to your user does not match any package in the database.", serverInvite: serverInvite } )
    }

    if (!resources) {
        packageinfo = `Not Set`
        extra = 0
        total = 0
        current = 0
        server_timers = 0
    } else {
        packageinfo = resources.packageinfo
        extra = resources.extra
        total = resources.total
        current = resources.current
    }

    const variables = { // Creates "variables" object for what variables are to be sent frontend.
        variables: req.session.variables || null,
        data: req.session.data || null,
        settings: settings,
        theme_settings: pagesFile,
        package: packageinfo,
        extra: extra,
        total: total,
        current: current,
        req: req,
        server_timers: server_timers,
    }

    if (req.session.variables) delete req.session.variables

    res.render(`${file}`, variables)
})

module.exports = router;