// Load packages

const fs = require('fs')
const path = require("path")
const yaml = require('js-yaml')
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const rateLimit = require('express-rate-limit')
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const settings = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8'))

const db = require("./functions/db")

const app = express()

app.set('view engine', 'ejs');

const theme = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8')).website.theme

app.set('views', path.join(__dirname, `themes/${theme}/pages`));

const store = new MongoDBStore({
    uri: settings.database.connectionuri,
    databaseName: settings.database.name,
    collection: 'sessions'
});

store.on('error', function (error) {
    console.log(error);
});

app.use(require('express-session')({
    secret: settings.website.secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: settings.website.secure
    },
    store: store,
}));

app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

app.set('view engine', 'ejs');

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) { // https://stackoverflow.com/questions/53048642/node-js-handle-body-parser-invalid-json-error
        // console.error(err);
        res.status(400)
        return res.send({
            error: 'An error has occured when trying to handle the request.'
        })
    }

    next()
})

app.use(async (req, res, next) => {
    if (req.session.data) {
        //Check if blacklisted here
    }

    next()
})

app.use("/api", require("./api/callback.js"))
app.use("/", require("./functions/pages.js"))

app.listen(settings.website.port, () => {
    console.log(`Website listening on port ${settings.website.port}`)
});