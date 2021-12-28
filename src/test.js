const express = require('express')
const yaml = require('js-yaml')
const fs = require("fs")
const path = require("path")
const app = express()

const theme = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8')).website.theme

app.set('views', path.join(__dirname, `themes/${theme}/pages`));

app.set('view engine', 'ejs');

app.use('/assets', express.static(path.join(__dirname, `themes/${theme}/assets`)));

app.get("/", (req, res) => {
    res.render("login")
})

app.listen(8000, () => {
    console.log(`Website listening on port 8000`)
});