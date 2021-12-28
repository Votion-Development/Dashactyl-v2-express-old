const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const fs = require('fs');

let theme = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8')).website.theme;
let pagesFile = yaml.load(fs.readFileSync(`./src/themes/${theme}/pages.yml`, 'utf8'));

let file;

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

            if (permission === 0 || permission === 1 || permission === 2) { // Checks if it is a valid permission number.
                /*
                0 = Anyone can view the page.
                1 = Only users logged in can view the page. 403 if not logged in.
                2 = Only administrators can view the page. 404 if not an administrator.
                */
                if (permission === 1 || permission === 2) {
                    console.log(req.session.data)
                    if (!req.session.data || !req.session.data.userinfo) {
                        res.status(403)
                        file = pagesFile.pages.error403.file // The value of "nopermission" on pages.yml is the page to be shown.
                    } else {
                        if (permission === 1) {
                            file = exists.file
                        } else if (permission === 2) { // Check if the route is administrator only.
                            if (!req.session.data.panelinfo.root_admin) { // If user isn't an administrator.
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
    if (!req.session.data || !req.session.data.userinfo) {
        res.render(file, { data: null })
    } else {
        res.render(file, { data: req.session.data })
    }
})

module.exports = router;