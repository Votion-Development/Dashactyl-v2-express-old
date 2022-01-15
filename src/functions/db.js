const fetch = require("node-fetch");
const { MongoClient } = require("mongodb");
const util = require("../util");

const settings = util.loadSettings();
const client = new MongoClient(settings.database.connectionuri);
const db = client.db(settings.database.name);

(async () => {
  await client.connect();
  console.log("Connected to the database.");

  const COLLECTIONS = [
    "users",
    "sessions",
    "coupons",
    "renewal_timer",
    "blacklisted",
    "packages",
    "eggs",
  ];

  for (const coll of COLLECTIONS) {
    db.listCollections({ name: coll }).next((_, data) => {
      if (!data) {
        db.createCollection(coll, async (err, doc) => {
          if (err)
            console.log(
              `There was an error creating the '${coll}' collection in the database. ` +
                "Please make sure that the connection URI is correct and that the user " +
                "has the correct permissions to create collections."
            );
          if (coll === `packages`) {
            await doc.insertOne({
              name: `Default Package`,
              memory: `1024`,
              disk: `1024`,
              cpu: `100`,
              servers: `1`,
              default: true,
              dateadded: Date(),
            });
          } else if (coll === `eggs`) {
            await doc.insertOne({
              name: `Default Egg`,
              display: `Default Egg`,
              minimum: {
                memory: 100,
                disk: 100,
                cpu: 10,
              },
              maximum: {
                memory: null,
                disk: null,
                cpu: null,
              },
              info: {
                egg: 3,
                docker_image: "quay.io/pterodactyl/core:java",
                startup:
                  "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}",
                environment: {
                  SERVER_JARFILE: "server.jar",
                  BUILD_NUMBER: "latest",
                },
                feature_limits: {
                  databases: 1,
                  backups: 1,
                },
              },
              default: true,
              dateadded: Date(),
            });
          }
          !err && !console.log(`Created the '${coll}' collection.`);
        });
      }
    });
  }
})();

async function getAllAccounts() {
  return await db.collection("users").find({}).toArray();
}

async function fetchAccount(id) {
  return await db.collection("users").findOne({ discordID: id });
}
async function createAccount(data) {
  const collection = db.collection("users");
  const user = await collection.findOne({ discordID: data.id });
  if (user) return;

  let password;
  if (settings.pterodactyl.generate_password_on_signup) {
    password =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  const res = await fetch(
    `${settings.pterodactyl.domain}/api/application/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${settings.pterodactyl.key}`,
      },
      body: JSON.stringify({
        username: data.id,
        email: data.email,
        first_name: data.username,
        last_name: data.discriminator,
        password,
      }),
    }
  );

  if (res.status === 201) {
    const json = (await res.json()).attributes;
    await collection.insertOne({
      discordID: data.id,
      pterodactylID: json.id,
      coins: 0,
      package: "default",
      memory: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
      dateAdded: Date.now(),
    });

    json.password &&= password;
    json.relationships = {
      servers: {
        object: "list",
        data: [],
      },
    };

    return json;
  } else {
    const accountlistjson = await fetch(
      `${
        settings.pterodactyl.domain
      }/api/application/users?include=servers&filter[email]=${encodeURIComponent(
        data.email
      )}`,
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );

    if (res.status === 201) {
      const json = (await res.json()).attributes;
      await collection.insertOne({
        discordID: data.id,
        pterodactylID: json.id,
        password,
        coins: 0,
        package: "default",
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        dateAdded: Date.now(),
      });

      json.password ||= password;
      json.relationships = {
        servers: {
          object: "list",
          data: [],
        },
      };

      return user[0].attributes;
    }

    return false;
  }
}

async function deleteAccount(id) {
  return await db.collection("users").deleteOne({ discordID: id });
}

async function checkBlacklisted(id) {
  const data = await db.collection("blacklisted").findOne({ discordID: id });

  return !!data;
}

async function getPackages(name = null) {
  const packages = await db.collection("packages").find({}).toArray();

  if (!name) return packages;
  if (name === "default") return packages.find((p) => p.default);
  return packages.find((p) => p.name === name);
}

async function addPackage(name, memory, disk, cpu, servers, isDefault) {
  const packages = await getPackages();
  if (packages.find((p) => p.name === name)) return false;

  await db.collection("packages").insertOne({
    name,
    memory,
    disk,
    cpu,
    servers,
    default: isDefault,
    dateAdded: Date.now(),
  });

  return true;
}

async function deletePackage(name) {
  await db.collection("packages").deleteOne({ name });
}
async function setResources(id, resources) {
  const collection = await db.collection("users");
  if (!collection) return false;
  const user = await collection.findOne({ discordID: id });
  if (!user) return false;
  if (!resources.memory) {
    resources.memory = user.memory;
  }

  if (!resources.disk) {
    resources.disk = user.disk;
  }

  if (!resources.cpu) {
    resources.cpu = user.cpu;
  }

  if (!resources.servers) {
    resources.servers = user.servers;
  }

  const config = await collection.updateOne(
    { discordID: id },
    {
      $set: { ...resources },
    }
  );
  return config;
}
async function setCoins(id, coins) {
  const collection = await db.collection("users");
  if (!collection) return false;
  const user = await collection.findOne({ discordID: id });
  if (!user) return false;

  if (typeof coins !== "number") return false;

  const config = await collection.updateOne(
    { discordID: id },
    {
      $set: {
        coins: coins,
      },
    }
  );

  return config;
}

module.exports = {
  getAllAccounts,
  fetchAccount,
  createAccount,
  deleteAccount,
  checkBlacklisted,
  getPackages,
  addPackage,
  deletePackage,
  setResources,
  setCoins,
};
