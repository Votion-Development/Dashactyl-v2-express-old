const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const util = require('../util');

const settings = util.loadSettings();
const client = new MongoClient(settings.database.connection_uri);
const db = client.db(settings.database.name);

(async () => {
    await client.connect();
    console.log('Connected to the database.');

    const DATABASES = [
        'users', 'sessions', 'coupons',
        'renewal_timer', 'blacklisted',
        'packages'
    ];

    for (const coll of DATABASES) {
        db.listCollections({ name: coll })
            .next((_, data) => {
                if (!data) {
                    db.createCollection(coll, (err, _) => {
                        if (err) console.log(
                            `There was an error creating the '${coll}' collection in the database. `+
                            'Please make sure that the connection URI is correct and that the user '+
                            'has the correct permissions to create collections.'
                        );
                    });
                }
            });
    }
})();

async function fetchAccount(id) {
    return await db
        .collection('users')
        .findOne({ discordID: id });
}

async function createAccount(data) {
    const collection = db.collection('users');
    const user = await collection.findOne({ discordID: data.id });
    if (user) return;

    let password;
    if (settings.pterodactyl.generate_password_on_signup) {
        password = Math.random()
            .toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    const res = await fetch(
        `${settings.pterodactyl.domain}/api/application/users`, {
            method: 'POST',
            headers:{
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${settings.pterodactyl.key}`
            },
            body: JSON.stringify({
                username: data.id,
                email: data.email,
                first_name: data.username,
                last_name: data.discriminator,
                password
            })
        }
    );

    if (res.status === 201) {
        const json = (await res.json()).attributes;
        await collection.insertOne({
            discordID: id,
            pterodactylID: json.password,
            coins: 0,
            package: 'default',
            memory: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
            dateAdded: Date.now()
        });

        json.password &&= password;
        json.relationships = {
            servers:{
                object: 'list',
                data: []
            }
        };

        return json;
    }
}

async function deleteAccount(id) {
    return await db
        .collection('users')
        .deleteOne({ discordID: id });
}

async function checkBlacklisted(id) {
    const data = await db
        .collection('users')
        .findOne({ discordID: id });

    return !!data;
}

async function getPackages(name = null) {
    const packages = await db
        .collection('packages')
        .find({})
        .toArray();

    if (!name) return packages;
    if (name === 'default') return packages.find(p => p.default);
    return packages.find(p => p.name === name);
}

async function addPackage(name, memory, disk, cpu, servers, isDefault) {
    const packages = await getPackages();
    if (packages.find(p => p.name === name)) return false;

    await db
        .collection('packages')
        .insertOne({
            name,
            memory,
            disk,
            cpu,
            servers,
            default: isDefault,
            dateAdded: Date.now()
        });

    return true;
}

async function deletePackage(name) {
    await db
        .collection('packages')
        .deleteOne({ name });
}

module.exports = {
    fetchAccount,
    createAccount,
    deleteAccount,
    checkBlacklisted,
    getPackages,
    addPackage,
    deletePackage
}
