// Load packages
const { readFileSync } = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const express = require("express");
const bodyParser = require("body-parser");
// const ratelimit = require('express-rate-limit');
const session = require("express-session");
const mongoStore = require("connect-mongodb-session")(session);
const settings = yaml.load(readFileSync("./src/settings.yml", "utf8"));
const {
  website: { theme },
} = yaml.load(readFileSync("./src/settings.yml", "utf8"));

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, `themes/${theme}/pages`));

const store = new mongoStore({
  uri: settings.database.connectionuri,
  databaseName: settings.database.name,
  collection: "sessions",
});
store.on("error", function (error) {
  console.log(error);
});

app.use(
  session({
    secret: settings.website.secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: settings.website.secure,
    },
    store: store,
  })
);
app.use(
  express.json({
    inflate: true,
    limit: "500kb",
    reviver: null,
    strict: true,
    verify: undefined,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((err, _, res, next) => {
  // https://stackoverflow.com/questions/53048642/node-js-handle-body-parser-invalid-json-error
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).send({
      error: "An error has occured when trying to handle the request.",
    });
  }

  next();
});

// TODO
// app.use(async (req, res, next) => {
//     if (req.session.data) {
//         //Check if blacklisted here
//     }

//     next()
// })
app.use("/auth", require("./auth/login"));
app.use("/", require("./handler"));
app.use("/store", require("./api/store"));
app.listen(settings.website.port, () => {
  console.log(`Website listening on port ${settings.website.port}`);
});
