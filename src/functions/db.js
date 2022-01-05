const {
    MongoClient
} = require('mongodb');
const yaml = require('js-yaml')
const fs = require("fs")
const fetch = require("node-fetch");
const res = require('express/lib/response');

const settings = yaml.load(fs.readFileSync('./src/settings.yml', 'utf8'))

const client = new MongoClient(settings.database.connectionuri);

const db = client.db(settings.database.name);

(async () => {
    await client.connect();
    console.log('Connected to the database.');

    db.listCollections({ name: "users" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("users", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The USERS collection has been added to the database.")
            }
        });
    db.listCollections({ name: "sessions" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("sessions", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The SESSIONS collection has been added to the database.")
            }
        });
    db.listCollections({ name: "coupons" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("coupons", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The COUPONS collection has been added to the database.")
            }
        });
    db.listCollections({ name: "renewal_timer" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("renewal_timer", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The RENEWAL_TIMER collection has been added to the database.")
            }
        });
    db.listCollections({ name: "blacklisted" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("blacklisted", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The BLACKLISTED collection has been added to the database.")
            }
        });
    db.listCollections({ name: "packages" })
        .next(function (err, collinfo) {
            if (!collinfo) {
                db.createCollection("packages", function (err, res) {
                    if (err) console.log("There was an error creating the required collections in the mongodb database. Please check the connection URI is correct and that the user has the correct permissions to make collections.");
                });
                console.log("The PACKAGES collection has been added to the database.")
            }
        });
})();

module.exports = {
    async createAccount(id, email, username, discriminator) {
        const collection = db.collection("users");

        const filteredDocs = await collection.findOne({
            discordID: id
        });

        if (!filteredDocs) {
            const generated_password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

            const first_name = username
            const last_name = discriminator

            const account = await fetch(
                `${settings.pterodactyl.domain}/api/application/users`, {
                method: 'POST',
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${settings.pterodactyl.key}`
                },
                body: JSON.stringify({
                    username: id,
                    email: email,
                    first_name: first_name,
                    last_name: last_name,
                    password: settings.pterodactyl.generate_password_on_sign_up ? generated_password : undefined
                })
            }
            )

            if (account.status === 201) {
                const accountinfo = await account.json()

                await collection.insertOne({
                    discordID: id,
                    pterodactylID: accountinfo.attributes.id,
                    coins: null,
                    package: null,
                    memory: null,
                    disk: null,
                    cpu: null,
                    servers: null,
                    dateadded: Date(),
                });

                accountinfo.attributes.password = generated_password

                accountinfo.attributes.relationships = {
                    servers: {
                        object: 'list',
                        data: []
                    }
                }

                return accountinfo.attributes
            } else {
                const accountlistjson = await fetch(
                    `${settings.pterodactyl.domain}/api/application/users?include=servers&filter[email]=${encodeURIComponent(email)}`, {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${settings.pterodactyl.key}`
                    }
                }
                )

                const accountlist = await accountlistjson.json()
                const user = accountlist.data.find(acc => acc.attributes.email === email)

                if (user) {
                    const userid = user.attributes.id

                    await collection.insertOne({
                        discordID: id,
                        pterodactylID: userid,
                        email: email,
                        username: username,
                        coins: 0,
                        package: `Not Set`,
                        memory: 0,
                        disk: 0,
                        cpu: 0,
                        servers: 0,
                        dateadded: Date(),
                    });

                    return user.attributes
                };
            }
        }
    },

    async fetchAccount(id) {
        const db = client.db("dashactyl");
        const collection = db.collection("users");

        const filteredDocs = await collection.findOne({
            discordID: id
        });

        return filteredDocs;
    },

    async blacklistStatus(id) {
        const db = client.db("dashactyl");
        const collection = db.collection("blacklisted");

        const filteredDocs = await collection.findOne({
            discordID: id
        });

        if (!filteredDocs) {
            return false;
        } else {
            return true;
        }
    },

    async addPackage(name, memory, disk, cpu, servers, isDefault) {
        const db = client.db("dashactyl");
        const collection = db.collection("packages");

        const filteredDocs = await collection.findOne({
            name: name
        });

        if (!filteredDocs) {
            await collection.insertOne({
                name: name,
                memory: memory,
                disk: disk,
                cpu: cpu,
                servers: servers,
                default: isDefault,
                dateadded: Date(),
            });

            return true;
        } else {
            return false;
        }
    },

    async getPackages() {
        const db = client.db("dashactyl");
        const collection = db.collection("packages");

        const foundResults = await collection.find({}).toArray();

        return foundResults
    },

    async getDefaultPackage() {
        const db = client.db("dashactyl");
        const collection = db.collection("packages");

        const filteredDocs = await collection.findOne({
            default: true
        });

        const package = filteredDocs.name

        return package;
    },

    async findPackage(package) {
        const db = client.db("dashactyl");
        const collection = db.collection("packages");

        const filteredDocs = await collection.findOne({
            name: package
        });

        return filteredDocs;
    },
}