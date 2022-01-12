const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongodb-session")(session);
const { join } = require("path");
const util = require("./util");

const settings = util.loadSettings();
const app = express();
const store = new MongoStore({
  uri: settings.database.connectionuri,
  databaseName: settings.database.name,
  collection: "sessions",
}).on("error", console.error);

app.set("view engine", "ejs");
app.set("views", join(__dirname, `themes/${settings.website.theme}/pages`));

app.use(
  session({
    secret: settings.website.secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: settings.website.secure,
    },
    store,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/auth", require("./auth/login"));
app.use("/", require("./handler"));
app.use("/store", require("./api/store"));

app.listen(settings.website.port, () => {
  console.log(`Website listening on port ${settings.website.port}`);
});
